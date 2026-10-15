const path = require('path');
const fs = require('fs');

// Automatically load environment variables from .env file with priority override
try {
    require('dotenv').config({ override: true });
} catch {}
if (fs.existsSync(path.join(__dirname, '.env'))) {
    try {
        const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...vals] = trimmed.split('=');
                const k = key.trim();
                const v = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
                if (k) {
                    process.env[k] = v;
                }
            }
        }
    } catch {}
}

// Protect process against uncaught connection/socket errors
process.on('uncaughtException', (err) => {
    console.error('[Baileys Worker UncaughtException]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Baileys Worker UnhandledRejection]:', reason?.message || reason);
});

const express = require('express');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    jidDecode,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fetch = require('node-fetch');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const sessions = new Map();
// Global map to translate LID -> Phone Number and Phone Number -> LID across connections
const lidToPhoneMap = new Map();
const phoneToLidMap = new Map();
const knownLids = new Set();

const MAPPINGS_FILE = path.join(__dirname, 'storage', 'lid_mappings.json');

/**
 * Load persisted LID and phone mappings from disk.
 */
function loadLidMappings() {
    try {
        if (fs.existsSync(MAPPINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf8'));
            if (Array.isArray(data.knownLids)) {
                for (const lid of data.knownLids) knownLids.add(String(lid));
            }
            if (data.phoneToLid && typeof data.phoneToLid === 'object') {
                for (const [k, v] of Object.entries(data.phoneToLid)) {
                    phoneToLidMap.set(k, v);
                }
            }
            if (data.lidToPhone && typeof data.lidToPhone === 'object') {
                for (const [k, v] of Object.entries(data.lidToPhone)) {
                    lidToPhoneMap.set(k, v);
                }
            }
        }
        
        // Auto-discover LIDs from existing session storage files
        const baseStorage = path.join(__dirname, 'storage', 'sessions');
        if (fs.existsSync(baseStorage)) {
            const dirs = fs.readdirSync(baseStorage);
            for (const d of dirs) {
                const sDir = path.join(baseStorage, d);
                if (fs.existsSync(sDir) && fs.statSync(sDir).isDirectory()) {
                    const files = fs.readdirSync(sDir);
                    for (const f of files) {
                        const m = f.match(/^session-([0-9]{14,16})\.0\.json$/);
                        if (m) {
                            knownLids.add(m[1]);
                        }
                    }
                }
            }
        }
        console.log(`[Baileys Worker] Loaded ${knownLids.size} known LIDs, ${phoneToLidMap.size} phone-to-LID maps.`);
    } catch (e) {
        console.warn('[Baileys Worker] Could not load lid_mappings.json:', e.message);
    }
}

/**
 * Save LID and phone mappings to disk.
 */
function saveLidMappings() {
    try {
        const dir = path.dirname(MAPPINGS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const data = {
            knownLids: Array.from(knownLids),
            phoneToLid: Object.fromEntries(phoneToLidMap),
            lidToPhone: Object.fromEntries(lidToPhoneMap)
        };
        fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.warn('[Baileys Worker] Could not save lid_mappings.json:', e.message);
    }
}

loadLidMappings();

const LARAVEL_API_URL = (process.env.LARAVEL_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const BAILEYS_SECRET_TOKEN = process.env.BAILEYS_SECRET_TOKEN || 'whatsomni_baileys_secret_key';

// Health and Ping probes - exempt from auth header for Docker/K8s/monitoring probes
app.get('/health', (req, res) => {
    return res.status(200).json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        sessions: sessions.size,
        knownLids: knownLids.size,
        laravel_api_url: LARAVEL_API_URL,
        timestamp: new Date().toISOString()
    });
});

app.get('/ping', (req, res) => {
    return res.status(200).send('pong');
});

// Authenticate all incoming HTTP control requests to Baileys microservice
app.use((req, res, next) => {
    const authSecret = req.headers['x-baileys-secret'];
    if (!authSecret || authSecret !== BAILEYS_SECRET_TOKEN) {
        return res.status(401).json({ message: 'Unauthorized: Invalid Baileys secret token.' });
    }
    next();
});

/**
 * Extract clean message text and media details from nested Baileys/WhatsApp message object.
 */
function extractMessageDetails(msg) {
    if (!msg || !msg.message) return { text: '', mediaType: 'text' };

    let m = msg.message;

    // Unwrap wrappers recursively
    for (let depth = 0; depth < 5; depth++) {
        if (!m) break;
        if (m.ephemeralMessage?.message) {
            m = m.ephemeralMessage.message;
        } else if (m.viewOnceMessage?.message) {
            m = m.viewOnceMessage.message;
        } else if (m.viewOnceMessageV2?.message) {
            m = m.viewOnceMessageV2.message;
        } else if (m.viewOnceMessageV2Extension?.message) {
            m = m.viewOnceMessageV2Extension.message;
        } else if (m.documentWithCaptionMessage?.message) {
            m = m.documentWithCaptionMessage.message;
        } else if (m.editedMessage?.message?.protocolMessage?.editedMessage) {
            m = m.editedMessage.message.protocolMessage.editedMessage;
        } else if (m.deviceSentMessage?.message) {
            m = m.deviceSentMessage.message;
        } else {
            break;
        }
    }

    if (!m) return { text: '', mediaType: 'text' };

    let text = '';
    let mediaType = 'text';

    if (m.conversation) {
        text = m.conversation;
    } else if (m.extendedTextMessage?.text) {
        text = m.extendedTextMessage.text;
    } else if (m.imageMessage) {
        text = m.imageMessage.caption || '';
        mediaType = 'image';
    } else if (m.videoMessage) {
        text = m.videoMessage.caption || '';
        mediaType = 'video';
    } else if (m.audioMessage) {
        text = '';
        mediaType = 'audio';
    } else if (m.documentMessage) {
        text = m.documentMessage.caption || m.documentMessage.fileName || '';
        mediaType = 'document';
    } else if (m.stickerMessage) {
        text = '[Sticker]';
        mediaType = 'sticker';
    } else if (m.contactMessage) {
        text = m.contactMessage.displayName ? `[Contact: ${m.contactMessage.displayName}]` : '[Contact card]';
        mediaType = 'contact';
    } else if (m.contactsArrayMessage) {
        text = '[Contacts]';
        mediaType = 'contact';
    } else if (m.locationMessage) {
        text = m.locationMessage.name ? `[Location: ${m.locationMessage.name}]` : '[Location pin]';
        mediaType = 'location';
    } else if (m.liveLocationMessage) {
        text = '[Live Location]';
        mediaType = 'location';
    } else if (m.templateButtonReplyMessage) {
        text = m.templateButtonReplyMessage.selectedDisplayText || m.templateButtonReplyMessage.selectedId || '';
    } else if (m.buttonsResponseMessage) {
        text = m.buttonsResponseMessage.selectedDisplayText || m.buttonsResponseMessage.selectedButtonId || '';
    } else if (m.listResponseMessage) {
        text = m.listResponseMessage.title || m.listResponseMessage.singleSelectReply?.selectedRowId || '';
    } else if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            text = params.id || params.title || JSON.stringify(params);
        } catch {
            text = m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson;
        }
    } else if (m.interactiveResponseMessage?.body?.text) {
        text = m.interactiveResponseMessage.body.text;
    } else if (m.reactionMessage) {
        text = m.reactionMessage.text ? `[Reaction: ${m.reactionMessage.text}]` : '';
        mediaType = 'reaction';
    } else if (m.pollCreationMessage || m.pollCreationMessageV2 || m.pollCreationMessageV3) {
        text = m.pollCreationMessage?.name || m.pollCreationMessageV2?.name || m.pollCreationMessageV3?.name || '[Poll]';
        mediaType = 'poll';
    }

    return { text: (text || '').trim(), mediaType };
}

/**
 * Format and resolve WhatsApp JID for outbound sending.
 */
function resolveOutboundJid(to) {
    if (!to) return '';
    let target = String(to).trim();

    // 1. If already complete JID with @s.whatsapp.net, @g.us, or @lid
    if (target.endsWith('@s.whatsapp.net') || target.endsWith('@g.us') || target.endsWith('@lid')) {
        return jidNormalizedUser(target);
    }

    // Strip any :device suffix if present
    target = target.split(':')[0];

    // Clean to numeric digits
    const cleanDigits = target.replace(/[^0-9]/g, '');
    if (!cleanDigits) return '';

    // 2. Check if cleanDigits or +cleanDigits is in phoneToLidMap
    const lidMatch = phoneToLidMap.get(target) || phoneToLidMap.get(cleanDigits) || phoneToLidMap.get(`+${cleanDigits}`);
    if (lidMatch) {
        return lidMatch.endsWith('@lid') ? lidMatch : `${lidMatch}@lid`;
    }

    // 3. Check if explicitly in knownLids
    if (knownLids.has(cleanDigits)) {
        return `${cleanDigits}@lid`;
    }

    // 4. Default standard WhatsApp phone number JID
    return `${cleanDigits}@s.whatsapp.net`;
}

/**
 * Send status/event updates back to the Laravel backend.
 */
async function postToLaravel(connectionId, payload, verifyToken) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${LARAVEL_API_URL}/api/integrations/baileys/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Baileys-Token': verifyToken,
            },
            signal: controller.signal,
            body: JSON.stringify({
                connection_id: Number(connectionId),
                ...payload
            })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Laravel webhook rejected payload for connection ${connectionId}: ${response.statusText}`);
        }
    } catch (err) {
        console.error(`Failed to post webhook event to Laravel: ${err.message}`);
    }
}

/**
 * Send incoming or outgoing device messages back to Laravel's channel webhook controller.
 */
async function postInboundMessage(connectionId, payload, verifyToken) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${LARAVEL_API_URL}/api/webhooks/channel/${connectionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Baileys-Token': verifyToken,
            },
            signal: controller.signal,
            body: JSON.stringify(payload)
        });
        clearTimeout(timeoutId);

        const resText = await response.text();
        console.log(`[Baileys Worker] Laravel ingress response for connection ${connectionId}: status ${response.status}, body: ${resText}`);

        if (!response.ok) {
            console.error(`Laravel ingress rejected message for connection ${connectionId}: ${response.statusText}`);
        }
    } catch (err) {
        console.error(`Failed to post message to Laravel: ${err.message}`);
    }
}

/**
 * Initialize a single Baileys instance session.
 */
async function startBaileysSession(connectionId, verifyToken) {
    const sessionKey = String(connectionId);

    // If session is already running, clean it up first
    if (sessions.has(sessionKey)) {
        try {
            sessions.get(sessionKey).sock.ev.removeAllListeners();
            sessions.get(sessionKey).sock.end();
        } catch {}
        sessions.delete(sessionKey);
    }

    const sessionDir = path.join(__dirname, 'storage', 'sessions', sessionKey);
    
    // Ensure dir exists
    if (!fs.existsSync(path.dirname(sessionDir))) {
        fs.mkdirSync(path.dirname(sessionDir), { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    let version = [2, 3000, 1017531287];
    try {
        const { version: latestVersion } = await fetchLatestBaileysVersion();
        version = latestVersion;
    } catch (err) {
        console.warn('Failed to fetch latest Baileys version, using fallback:', err.message);
    }

    const browserConfig = Browsers?.ubuntu ? Browsers.ubuntu('Desktop') : ['Ubuntu', 'Desktop', '22.04.4'];

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: browserConfig,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        defaultQueryTimeoutMs: 60000,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async () => undefined,
    });

    const existingSession = sessions.get(sessionKey);
    const retryCount = existingSession?.retryCount || 0;

    sessions.set(sessionKey, { sock, verifyToken, latestQr: null, status: 'connecting', retryCount });

    sock.ev.on('creds.update', saveCreds);

    // Cache contact and LID mappings
    const recordContactMapping = (contacts) => {
        if (!Array.isArray(contacts)) return;
        let changed = false;
        for (const contact of contacts) {
            if (contact && contact.id && contact.lid) {
                const phonePart = contact.id.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                const lidPart = contact.lid.split('@')[0].split(':')[0];
                if (phonePart && lidPart) {
                    lidToPhoneMap.set(contact.lid, phonePart);
                    lidToPhoneMap.set(lidPart, phonePart);
                    phoneToLidMap.set(phonePart, contact.lid);
                    phoneToLidMap.set(`+${phonePart}`, contact.lid);
                    knownLids.add(lidPart);
                    changed = true;
                }
            }
        }
        if (changed) saveLidMappings();
    };

    sock.ev.on('contacts.upsert', recordContactMapping);
    sock.ev.on('contacts.update', recordContactMapping);

    sock.ev.on('chats.phoneNumberShare', async ({ lid, jid }) => {
        console.log(`[Baileys Worker] Phone number share event: lid=${lid} -> jid=${jid}`);
        if (lid && jid) {
            const phonePart = jid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const lidPart = lid.split('@')[0].split(':')[0];
            if (phonePart && lidPart) {
                lidToPhoneMap.set(lid, phonePart);
                lidToPhoneMap.set(lidPart, phonePart);
                phoneToLidMap.set(phonePart, lid);
                phoneToLidMap.set(`+${phonePart}`, lid);
                phoneToLidMap.set(lidPart, lid);
                knownLids.add(lidPart);
                saveLidMappings();
            }
        }
    });

    // Listen for message status / delivery receipts from WhatsApp server
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            const messageId = update.key?.id;
            const status = update.update?.status;
            if (!messageId || status === undefined) continue;

            let deliveryStatus = null;
            if (status === 2) deliveryStatus = 'sent';
            else if (status === 3) deliveryStatus = 'delivered';
            else if (status === 4 || status === 5) deliveryStatus = 'read';

            if (deliveryStatus) {
                console.log(`[Baileys Worker] Message status update for ${messageId}: ${deliveryStatus} (code ${status})`);
                await postInboundMessage(connectionId, {
                    type: 'status',
                    external_message_id: messageId,
                    delivery_status: deliveryStatus
                }, verifyToken);
            }
        }
    });

    sock.ev.on('message-receipt.update', async (receipts) => {
        for (const receipt of receipts) {
            const messageId = receipt.key?.id;
            if (!messageId) continue;
            console.log(`[Baileys Worker] Message receipt for ${messageId}: delivered`);
            await postInboundMessage(connectionId, {
                type: 'status',
                external_message_id: messageId,
                delivery_status: 'delivered'
            }, verifyToken);
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[Baileys Worker] QR generated for connection ID: ${connectionId}`);
            try {
                const qrImage = await QRCode.toDataURL(qr);
                const session = sessions.get(sessionKey);
                if (session) {
                    session.latestQr = qrImage;
                    session.status = 'connecting';
                }
                await postToLaravel(connectionId, { event: 'qr', qr: qrImage }, verifyToken);
            } catch (err) {
                console.error('Failed to generate QR data URL:', err.message);
            }
        }

        if (connection === 'close') {
            const error = lastDisconnect?.error;
            const statusCode = error?.output?.statusCode;
            const errorMessage = (error?.output?.payload?.message || error?.message || '').toLowerCase();
            
            console.log(`[Baileys Worker] Connection closed for ID: ${connectionId}. statusCode: ${statusCode}, error: ${errorMessage}`);

            // If WhatsApp says loggedOut (401), credentials are permanently invalidated by WhatsApp!
            // Retrying with dead credentials will forever fail with connection failure.
            const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

            if (isLoggedOut) {
                console.log(`[Baileys Worker] Explicitly logged out / unauthorized session ID: ${connectionId}. Deleting local session data.`);
                try {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                } catch {}
                sessions.delete(sessionKey);
                await postToLaravel(connectionId, { event: 'disconnected' }, verifyToken);
                return;
            }

            // Connection replaced (440) means another WhatsApp Web / Baileys instance connected with this session
            if (statusCode === DisconnectReason.connectionReplaced || statusCode === 440) {
                console.log(`[Baileys Worker] Session ${connectionId} was replaced by another connection (440).`);
                sessions.delete(sessionKey);
                await postToLaravel(connectionId, { event: 'disconnected' }, verifyToken);
                return;
            }

            // Check if this session has ever been paired/registered
            const credsFilePath = path.join(sessionDir, 'creds.json');
            let isRegistered = false;
            try {
                if (fs.existsSync(credsFilePath)) {
                    const parsedCreds = JSON.parse(fs.readFileSync(credsFilePath, 'utf8'));
                    isRegistered = Boolean(parsedCreds && (parsedCreds.registered || parsedCreds.me?.id));
                }
            } catch {}

            // For recoverable errors (e.g. 515 restartRequired, connectionLost 408, timedOut 408, socket hang up)
            const sessionData = sessions.get(sessionKey) || {};
            const retryCount = (sessionData.retryCount || 0) + 1;
            sessionData.retryCount = retryCount;
            sessionData.status = 'connecting';
            sessions.set(sessionKey, sessionData);

            if (!isRegistered && (statusCode === 408 || statusCode === DisconnectReason.timedOut || String(error).includes('qr refs attempts ended') || retryCount >= 1)) {
                // Unregistered session waiting for initial QR scan expired without user scanning
                console.warn(`[Baileys Worker] Unregistered session ${connectionId} expired without QR scan. Stopping reconnect.`);
                sessions.delete(sessionKey);
                await postToLaravel(connectionId, { event: 'disconnected' }, verifyToken);
                return;
            }

            // For registered sessions, keep reconnecting with exponential backoff (max 30s)
            const delayMs = isRegistered
                ? Math.min(retryCount * 3000, 30000)
                : Math.min(retryCount * 2500, 10000);

            console.log(`[Baileys Worker] Reconnecting session ${connectionId} (registered=${isRegistered}) in ${delayMs}ms (attempt ${retryCount})...`);
            setTimeout(() => {
                startBaileysSession(connectionId, verifyToken);
            }, delayMs);
        } else if (connection === 'open') {
            console.log(`[Baileys Worker] Connection opened successfully for ID: ${connectionId}`);
            const session = sessions.get(sessionKey);
            if (session) {
                session.latestQr = null;
                session.status = 'connected';
                session.retryCount = 0;
            }
            await postToLaravel(connectionId, { event: 'connected' }, verifyToken);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' && m.type !== 'append') return;

        for (const msg of m.messages) {
            const rawFrom = msg.key.remoteJid;
            if (!rawFrom || rawFrom.includes('broadcast') || rawFrom.includes('status') || rawFrom.includes('newsletter')) continue;

            const isOutbound = Boolean(msg.key.fromMe);
            const { text, mediaType } = extractMessageDetails(msg);

            // Skip messages with no text and no media
            if (!text && mediaType === 'text') {
                continue;
            }

            // Extract real phone number and JID
            const isLid = rawFrom.includes('@lid');
            const lidUser = isLid ? (jidDecode(rawFrom)?.user || rawFrom.split('@')[0].split(':')[0]) : null;
            if (isLid && lidUser) {
                knownLids.add(lidUser);
                phoneToLidMap.set(lidUser, `${lidUser}@lid`);
            }

            let realPhoneNumber = null;

            if (isLid) {
                if (msg.key.senderPn) {
                    realPhoneNumber = msg.key.senderPn.split('@')[0].split(':')[0];
                } else if (msg.key.participantPn) {
                    realPhoneNumber = msg.key.participantPn.split('@')[0].split(':')[0];
                } else if (msg.key.remoteJidAlt && msg.key.remoteJidAlt.includes('@s.whatsapp.net')) {
                    realPhoneNumber = msg.key.remoteJidAlt.split('@')[0].split(':')[0];
                } else if (msg.key.participant && msg.key.participant.includes('@s.whatsapp.net')) {
                    realPhoneNumber = msg.key.participant.split('@')[0].split(':')[0];
                } else if (lidToPhoneMap.has(rawFrom) || lidToPhoneMap.has(lidUser)) {
                    realPhoneNumber = lidToPhoneMap.get(rawFrom) || lidToPhoneMap.get(lidUser);
                } else {
                    try {
                        if (sock.signalRepository?.lidMapping?.getPNForLID) {
                            const pn = await sock.signalRepository.lidMapping.getPNForLID(rawFrom);
                            if (pn) {
                                realPhoneNumber = pn.split('@')[0].split(':')[0];
                            }
                        }
                    } catch {}
                }

                if (realPhoneNumber) {
                    lidToPhoneMap.set(rawFrom, realPhoneNumber);
                    lidToPhoneMap.set(lidUser, realPhoneNumber);
                    phoneToLidMap.set(realPhoneNumber, `${lidUser}@lid`);
                    phoneToLidMap.set(`+${realPhoneNumber}`, `${lidUser}@lid`);
                }
                saveLidMappings();
            } else {
                const decoded = jidDecode(rawFrom);
                if (decoded && decoded.user) {
                    realPhoneNumber = decoded.user;
                } else {
                    realPhoneNumber = rawFrom.split('@')[0].split(':')[0];
                }
            }

            if (realPhoneNumber) {
                realPhoneNumber = String(realPhoneNumber).replace(/[^0-9]/g, '');
            }

            // Get sender profile display name
            const pushName = (msg.pushName || '').trim();
            const senderDisplayName = isOutbound ? 'Me (WhatsApp)' : (pushName || (realPhoneNumber ? `+${realPhoneNumber}` : 'WhatsApp User'));

            // If real phone is known, use it. If it's a LID with no phone number known, preserve the LID JID
            const externalChatId = realPhoneNumber || (isLid ? `${lidUser}@lid` : rawFrom);

            console.log(`[Baileys Worker] Message event on ID ${connectionId} [${isOutbound ? 'OUTBOUND' : 'INBOUND'}] externalChatId: ${externalChatId}, body: "${text}"`);

            await postInboundMessage(connectionId, {
                direction: isOutbound ? 'outbound' : 'inbound',
                external_chat_id: externalChatId,
                sender_identifier: senderDisplayName,
                external_message_id: msg.key.id,
                message_type: mediaType || 'text',
                body: text || (mediaType !== 'text' ? `[${mediaType}]` : ''),
                delivery_status: isOutbound ? 'sent' : 'delivered',
            }, verifyToken);
        }
    });
}

/**
 * Endpoint to start a session.
 */
app.post('/sessions/start', async (req, res) => {
    const { connection_id, webhook_verify_token } = req.body;
    if (!connection_id || !webhook_verify_token) {
        return res.status(400).json({ message: 'Missing parameters.' });
    }

    console.log(`[Baileys Worker] Starting connection request for ID: ${connection_id}`);
    startBaileysSession(connection_id, webhook_verify_token);
    
    return res.json({ success: true });
});

/**
 * Endpoint to retrieve current QR code or status for a session.
 */
app.get('/sessions/:id/qr', (req, res) => {
    const sessionKey = String(req.params.id);
    const session = sessions.get(sessionKey);
    if (!session) {
        return res.status(404).json({ message: `Session ${req.params.id} not found in worker.`, qr: null });
    }
    return res.json({
        connection_id: Number(req.params.id),
        status: session.status || 'connecting',
        qr: session.latestQr || null,
    });
});

/**
 * Endpoint to stop a session.
 */
app.post('/sessions/stop', async (req, res) => {
    const { connection_id } = req.body;
    if (!connection_id) {
        return res.status(400).json({ message: 'Missing connection_id.' });
    }

    const sessionKey = String(connection_id);
    console.log(`[Baileys Worker] Stopping connection request for ID: ${connection_id}`);
    
    if (sessions.has(sessionKey)) {
        const { sock } = sessions.get(sessionKey);
        try {
            sock.ev.removeAllListeners();
            sock.end();
        } catch {}
        sessions.delete(sessionKey);
    }

    // Wipe directory files
    const sessionDir = path.join(__dirname, 'storage', 'sessions', sessionKey);
    try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}

    return res.json({ success: true });
});

/**
 * Endpoint to send a message.
 */
app.post('/sessions/send', async (req, res) => {
    const { connection_id, to, external_chat_id, body, media_url } = req.body;
    const recipient = to || external_chat_id;
    
    if (!connection_id || !recipient || (body === undefined && !media_url)) {
        return res.status(400).json({ message: 'Missing send parameters (connection_id, recipient, body or media_url required).' });
    }

    const sessionKey = String(connection_id);
    const session = sessions.get(sessionKey);
    if (!session || !session.sock) {
        return res.status(404).json({ message: `Session ${connection_id} not active/found in worker.` });
    }

    if (session.status !== 'connected') {
        return res.status(503).json({ 
            message: `WhatsApp session ${connection_id} is not connected (status: ${session.status || 'disconnected'}). Please scan QR code in Channels.` 
        });
    }

    const { sock } = session;
    const jid = resolveOutboundJid(recipient);

    console.log(`[Baileys Worker] Outbound send request on ID ${connection_id}: recipient="${recipient}" -> resolvedJid="${jid}"`);

    if (!jid) {
        return res.status(400).json({ message: `Invalid recipient format: "${recipient}"` });
    }

    try {
        let messagePayload = { text: body || '' };

        if (media_url) {
            const cleanUrl = media_url.split('?')[0];
            const ext = path.extname(cleanUrl).toLowerCase().replace('.', '');
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
            const isAudio = ['mp3', 'ogg', 'wav', 'm4a', 'aac'].includes(ext);
            const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

            if (isImage) {
                messagePayload = { 
                    image: { url: media_url }, 
                    caption: body || '' 
                };
            } else if (isAudio) {
                messagePayload = { 
                    audio: { url: media_url }, 
                    mimetype: ext === 'mp3' ? 'audio/mp4' : `audio/${ext}`, 
                    ptt: false 
                };
            } else if (isVideo) {
                messagePayload = { 
                    video: { url: media_url }, 
                    caption: body || '' 
                };
            } else {
                messagePayload = { 
                    document: { url: media_url }, 
                    fileName: path.basename(cleanUrl) || 'attachment', 
                    caption: body || '' 
                };
            }
        }

        // Send with 10-second timeout to prevent hanging the worker event loop
        const sendPromise = sock.sendMessage(jid, messagePayload);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WhatsApp message dispatch timed out after 10s')), 10000)
        );
        const sent = await Promise.race([sendPromise, timeoutPromise]);

        console.log(`[Baileys Worker] Message successfully dispatched to ${jid} on connection ID ${connection_id}. Key ID: ${sent?.key?.id}`);
        return res.json({ 
            success: true, 
            message_id: sent?.key?.id || ('baileys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9))
        });
    } catch (err) {
        console.error(`[Baileys Worker] Send message failed on ID ${connection_id} to ${jid}: ${err.message}`);
        return res.status(500).json({ message: 'Send failed: ' + err.message });
    }
});

/**
 * Auto-recovery on startup: query Laravel active sessions and start them.
 */
async function recoverSessions() {
    try {
        console.log(`[Baileys Worker] Querying active sessions from Laravel at ${LARAVEL_API_URL}...`);
        const response = await fetch(`${LARAVEL_API_URL}/api/integrations/baileys/sessions`, {
            headers: {
                'X-Baileys-Worker-Secret': BAILEYS_SECRET_TOKEN
            }
        });
        if (response.ok) {
            const data = await response.json();
            const activeSessions = data.sessions || [];
            console.log(`[Baileys Worker] Found ${activeSessions.length} active sessions to recover.`);
            
            for (const session of activeSessions) {
                const connectionId = session.connection_id;
                const verifyToken = session.credentials?.webhook_verify_token;
                if (connectionId && verifyToken) {
                    console.log(`[Baileys Worker] Recovering session ID: ${connectionId}`);
                    startBaileysSession(connectionId, verifyToken);
                }
            }
        } else {
            console.warn(`[Baileys Worker] Auto-recovery received HTTP ${response.status} from Laravel. Retrying in 10s...`);
            setTimeout(recoverSessions, 10000);
        }
    } catch (err) {
        console.warn(`[Baileys Worker] Auto-recovery failed: ${err.message}. Retrying in 10s...`);
        setTimeout(recoverSessions, 10000);
    }
}

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
    console.log(`[Baileys Worker] Running on port ${PORT}, backend API URL: ${LARAVEL_API_URL}`);
    recoverSessions();
});
