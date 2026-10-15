'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';

const InboxStartChatModal = dynamic(
  () => import('./components/InboxStartChatModal'),
  { ssr: false }
);

const InboxWhatsAppFlowModal = dynamic(
  () => import('./components/InboxWhatsAppFlowModal'),
  { ssr: false }
);

const InboxEcommerceModal = dynamic(
  () => import('./components/InboxEcommerceModal'),
  { ssr: false }
);
import { useTranslations } from 'next-intl';
// Fixed 3-pane layout
import { fetchWithCsrf, getBackendUrl } from '@/lib/api';
import { echo } from '@/lib/echo';
import { toast } from 'sonner';
import CustomSelect from '@/components/ui/CustomSelect';
import { DropdownSelect } from '@/components/ui/dropdown-select';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  Sparkles, 
  Lock, 
  User, 
  Users as UsersIcon, 
  Bot, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Info, 
  X, 
  FileText, 
  Plus, 
  VolumeX, 
  Volume2, 
  Trash2, 
  MoreVertical, 
  ShieldAlert, 
  Clock, 
  ShoppingBag, 
  Loader2, 
  PanelRightClose, 
  PanelRightOpen,
  Mail,
  Phone,
  Tag,
  Copy,
  ExternalLink,
  ChevronDown,
  ArrowLeft,
  Zap,
  CornerDownLeft,
  FormInput,
  CheckCircle2,
  Percent,
  BadgePercent,
  Store,
  RefreshCw,
  Package,
  Layers3
} from 'lucide-react';

interface CurrentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  tenant_id: number;
  channel_access_type?: 'all' | 'custom';
  accessible_channel_ids?: number[] | null;
  role?: {
    name: string;
    display_name: string;
  };
}

interface MessageReceivedEvent {
  id: number;
  conversation_id: number;
  direction: string;
  message_type: string;
  sender_identifier: string | null;
  body: string | null;
  media_url: string | null;
  external_message_id: string | null;
  delivery_status: string;
  created_at?: string;
}

interface ConversationUpdatedEvent {
  id: number;
  status: string;
  assigned_user_id: number | null;
  assigned_team_id: number | null;
  ai_active: boolean;
}

interface Contact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
  email: string | null;
  phone: string | null;
  lifecycle_stage: string;
  opted_out_channels: string[] | null;
  tags?: string[] | null;
  is_muted?: boolean;
}

interface ChannelConnection {
  id: number;
  channel_type: string;
  name: string;
  status: string;
}

interface LastMessage {
  id: number;
  body: string | null;
  message_type: string;
  direction: string;
  delivery_status: string;
  created_at: string;
}

interface Conversation {
  id: number;
  tenant_id: number;
  channel_connection_id: number;
  contact_id: number | null;
  external_chat_id: string;
  status: string;
  assigned_user_id: number | null;
  assigned_team_id: number | null;
  ai_active: boolean;
  last_message_at: string | null;
  unread_count?: number;
  contact: Contact | null;
  channel_connection: ChannelConnection | null;
  last_message?: LastMessage | null;
}

interface Message {
  id: number;
  conversation_id: number;
  direction: string;
  message_type: string;
  sender_identifier: string | null;
  sender_type?: string | null;
  is_ai?: boolean;
  body: string | null;
  media_url: string | null;
  external_message_id: string | null;
  delivery_status: string;
  error_message: string | null;
  metadata?: any;
  created_at: string;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Team {
  id: number;
  name: string;
}

const CATEGORIZED_EMOJIS = [
  {
    category: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓']
  },
  {
    category: 'Gestures',
    emojis: ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '✍️', '👏', '🙌', '👐', '🤲', '🤝', '🙏']
  },
  {
    category: 'Hearts & Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🌟', '⭐', '✨', '⚡', '🔥', '💥', '💯', '🎉', '🎈']
  }
];

export default function SharedInboxPage() {
  const t = useTranslations('Inbox');
  const tCommon = useTranslations('Common');
  const tContacts = useTranslations('Contacts');
  const tFlows = useTranslations('WhatsAppFlows');

  const getStatusLabel = (status: string | null) => {
    if (!status) return '';
    if (status === 'open') return tCommon('statusOpen');
    if (status === 'pending') return tCommon('statusPending');
    if (status === 'resolved') return tCommon('statusResolved');
    return status;
  };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Filters & Search
  const [statusTab, setStatusTab] = useState<'open' | 'pending' | 'resolved'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<'open' | 'pending' | 'resolved' | null>(null);
  const [assigneeHeaderDropdownOpen, setAssigneeHeaderDropdownOpen] = useState(false);
  const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showContactSidebar, setShowContactSidebar] = useState(true);
  const [isMuting, setIsMuting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // E-commerce context state
  const [hasEcommerceIntegration, setHasEcommerceIntegration] = useState<boolean>(false);
  const [ecoContext, setEcoContext] = useState<{
    active_cart: any;
    orders: any[];
  } | null>(null);
  const [ecoLoading, setEcoLoading] = useState(false);

  // Composer
  const [composerMode, setComposerMode] = useState<'reply' | 'note'>('reply');
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMediaPreviewUrl, setActiveMediaPreviewUrl] = useState<string | null>(null);

  // CRM edit side
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStage, setEditStage] = useState('lead');
  const [newTagText, setNewTagText] = useState('');

  // Start Conversation Modal
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [allChannels, setAllChannels] = useState<ChannelConnection[]>([]);

  // Quick Replies & Shortcut Commands
  const [quickRepliesList, setQuickRepliesList] = useState<any[]>([]);
  const [showQuickRepliesPopup, setShowQuickRepliesPopup] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // WhatsApp Flow Form State
  const [whatsAppFlowsList, setWhatsAppFlowsList] = useState<any[]>([]);
  const [showWhatsAppFlowModal, setShowWhatsAppFlowModal] = useState(false);

  // E-Commerce Catalog & Special Offer Actions State
  const [showEcommerceModal, setShowEcommerceModal] = useState(false);
  const [ecommerceModalTab, setEcommerceModalTab] = useState<'products' | 'whatsapp_catalog' | 'discounts'>('products');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isAtBottomRef = useRef(true);
  const messageQueueRef = useRef<{ id: number; conversationId: number; endpoint: string; body: BodyInit }[]>([]);
  const isSendingQueueRef = useRef<boolean>(false);

  // Fetch initial context
  useEffect(() => {
    setMounted(true);
    const fetchContext = async () => {
      try {
        const meRes = await fetchWithCsrf('/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        }

        const membersRes = await fetchWithCsrf('/members');
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
        }

        const teamsRes = await fetchWithCsrf('/teams');
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.teams || []);
        }

        const contactsRes = await fetchWithCsrf('/contacts');
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setAllContacts(contactsData.contacts || contactsData || []);
        }

        const channelsRes = await fetchWithCsrf('/channels');
        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          const filtered = (channelsData || []).filter((c: any) => {
            const name = (c.name || '').toLowerCase();
            const type = (c.channel_type || '').toLowerCase();
            return !name.includes('mock') && !name.includes('simulated') && type !== 'mock';
          });
          setAllChannels(filtered);
        }

        // Check if tenant has connected E-Commerce store integration
        const ecoRes = await fetchWithCsrf('/integrations/ecommerce/status');
        if (ecoRes.ok) {
          const ecoData = await ecoRes.json();
          const isConnected = Array.isArray(ecoData) && ecoData.some((c: any) => c.status === 'active' || c.is_active);
          setHasEcommerceIntegration(isConnected);
        }

        // Fetch Quick Replies for composer
        const qrRes = await fetchWithCsrf('/quick-replies');
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          setQuickRepliesList(qrData.quick_replies || []);
        }

        // Fetch WhatsApp Flows for composer integration
        const flowsRes = await fetchWithCsrf('/whatsapp-flows');
        if (flowsRes.ok) {
          const flowsData = await flowsRes.json();
          setWhatsAppFlowsList(Array.isArray(flowsData) ? flowsData : (flowsData.flows || flowsData.data || []));
        }
      } catch (err) {
        console.error('Failed to load user list contexts', err);
      }
    };
    fetchContext();
  }, []);

  const getMediaUrl = (url: string | null) => {
    if (!url) return '';
    if (url.includes('/storage/')) {
      const backendUrl = getBackendUrl();
      const storagePath = url.substring(url.indexOf('/storage/'));
      return `${backendUrl}${storagePath}`;
    }
    return url;
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      let url = `/conversations?status=${statusTab}`;
      if (assigneeFilter === 'unassigned') {
        url += '&assigned_user_id=unassigned';
      } else if (assigneeFilter === 'me' && currentUser) {
        url += `&assigned_user_id=${currentUser.id}`;
      }
      const res = await fetchWithCsrf(url);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!activeConvIdRef.current && data.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [statusTab, assigneeFilter, currentUser]);

  // Handle active conversation details & messages loading
  const activeConv = conversations.find(c => c.id === activeConvId);
  const activeConvIdRef = useRef<number | null>(null);

  const isWhatsAppActive = ['whatsapp', 'whatsapp_cloud'].includes(
    (activeConv?.channel_connection?.channel_type || '').toLowerCase()
  );

  // Scroll helper functions
  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 60;
    isAtBottomRef.current = isNearBottom;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
    setShowScrollBottom(false);
    isAtBottomRef.current = true;
  };

  // Handle active conversation details & messages loading
  useEffect(() => {
    if (!activeConvId) return;

    activeConvIdRef.current = activeConvId;
    isAtBottomRef.current = true;
    setShowScrollBottom(false);

    let isFirstLoad = true;

    const loadMessages = async () => {
      try {
        const res = await fetchWithCsrf(`/conversations/${activeConvId}/messages`);
        if (res.ok) {
          const data: Message[] = await res.json();
          if (activeConvIdRef.current !== activeConvId) return;

          setMessages(prev => {
            // Check if messages actually changed to avoid re-render cycles
            if (prev.length === data.length) {
              const isDifferent = prev.some((msg, idx) => {
                const newMsg = data[idx];
                return !newMsg || 
                  msg.id !== newMsg.id || 
                  msg.delivery_status !== newMsg.delivery_status || 
                  msg.body !== newMsg.body ||
                  msg.media_url !== newMsg.media_url;
              });
              if (!isDifferent) {
                return prev;
              }
            }

            // If new messages arrived and user is at bottom, scroll down
            if (!isFirstLoad && data.length > prev.length && isAtBottomRef.current) {
              setTimeout(() => {
                if (chatContainerRef.current && isAtBottomRef.current) {
                  chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }, 40);
            }

            return data;
          });

          // On initial conversation selection, scroll down immediately
          if (isFirstLoad) {
            isFirstLoad = false;
            setTimeout(() => {
              if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
              }
            }, 40);
          }

          // Mark conversation unread count locally to 0
          setConversations(prev => 
            prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c)
          );
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  useEffect(() => {
    setEcoContext(null);
    if (activeConv && activeConv.contact) {
      setEditFirstName(activeConv.contact.first_name || '');
      setEditLastName(activeConv.contact.last_name || '');
      setEditEmail(activeConv.contact.email || '');
      setEditPhone(activeConv.contact.phone || '');
      setEditStage(activeConv.contact.lifecycle_stage || 'lead');

      const contactEmail = activeConv.contact.email || '';
      const contactPhone = activeConv.contact.phone || '';

      // Only fetch e-commerce context if e-commerce integration is connected
      if ((contactEmail || contactPhone) && hasEcommerceIntegration) {
        const fetchEcoContext = async () => {
          setEcoLoading(true);
          try {
            const res = await fetchWithCsrf(`/integrations/ecommerce/customer-context?email=${encodeURIComponent(contactEmail)}&phone=${encodeURIComponent(contactPhone)}`);
            if (res.ok) {
              const json = await res.json();
              if (json.has_integration === false) {
                setHasEcommerceIntegration(false);
                setEcoContext(null);
              } else {
                setEcoContext(json);
              }
            }
          } catch (e) {
            console.error('Failed to fetch customer eco context', e);
          } finally {
            setEcoLoading(false);
          }
        };
        fetchEcoContext();
      }
    }
  }, [activeConvId, hasEcommerceIntegration]);

  // Laravel Echo events listener
  useEffect(() => {
    if (!echo || !currentUser) return;

    const tenantId = currentUser.tenant_id;
    const channelName = `tenant.${tenantId}.chats`;

    echo.private(channelName)
      .listen('MessageReceived', (e: MessageReceivedEvent) => {
        // e contains message payload
        const newMsg: Message = {
          id: e.id,
          conversation_id: e.conversation_id,
          direction: e.direction,
          message_type: e.message_type,
          sender_identifier: e.sender_identifier,
          body: e.body,
          media_url: e.media_url || null,
          external_message_id: e.external_message_id,
          delivery_status: e.delivery_status,
          error_message: null,
          created_at: e.created_at || new Date().toISOString()
        };

        // 1. If active thread, append message or replace optimistic placeholder
        if (activeConvIdRef.current === e.conversation_id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id || (m.external_message_id && m.external_message_id === newMsg.external_message_id))) {
              return prev;
            }
            if (newMsg.direction === 'outbound') {
              // Try to find matching optimistic sending item by body text
              const optIndex = prev.findIndex(m => m.id < 0 && m.body === newMsg.body);
              if (optIndex !== -1) {
                return prev.map((m, idx) => idx === optIndex ? newMsg : m);
              }
              // If body didn't match exactly (e.g., media upload), replace oldest optimistic sending item
              const oldestOptIndex = prev.findIndex(m => m.id < 0);
              if (oldestOptIndex !== -1) {
                return prev.map((m, idx) => idx === oldestOptIndex ? newMsg : m);
              }
            }
            return [...prev, newMsg];
          });
        }

        // 2. Refresh or adjust conversations array order/last message
        setConversations(prev => {
          const match = prev.find(c => c.id === e.conversation_id);
          if (match) {
            return prev.map(c => {
              if (c.id === e.conversation_id) {
                return {
                  ...c,
                  last_message_at: newMsg.created_at,
                  unread_count: activeConvIdRef.current === e.conversation_id ? 0 : (c.unread_count || 0) + (e.direction === 'inbound' ? 1 : 0),
                  last_message: {
                    id: newMsg.id,
                    body: newMsg.body,
                    message_type: newMsg.message_type,
                    direction: newMsg.direction,
                    delivery_status: newMsg.delivery_status,
                    created_at: newMsg.created_at
                  }
                };
              }
              return c;
            }).sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
          } else {
            // Fetch updated list to load newly initialized chats
            fetchConversations();
            return prev;
          }
        });
      })
      .listen('ConversationUpdated', (e: ConversationUpdatedEvent) => {
        setConversations(prev => 
          prev.map(c => c.id === e.id ? { 
            ...c, 
            status: e.status, 
            assigned_user_id: e.assigned_user_id,
            assigned_team_id: e.assigned_team_id,
            ai_active: e.ai_active 
          } : c)
        );
      });

    return () => {
      if (echo) {
        echo.leave(channelName);
      }
    };
  }, [currentUser]);

  const processMessageQueue = async () => {
    if (isSendingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }
    isSendingQueueRef.current = true;
    const task = messageQueueRef.current[0]; // peek at first task

    try {
      const res = await fetchWithCsrf(task.endpoint, {
        method: 'POST',
        body: task.body
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => {
          if (prev.some(m => m.id === task.id)) {
            return prev.map(m => m.id === task.id ? newMsg : m);
          }
          return prev;
        });
        setConversations(prev => prev.map(c => {
          if (c.id === task.conversationId) {
            return { ...c, last_message_at: newMsg.created_at, last_message: newMsg };
          }
          return c;
        }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || t('toastDispatchFailed'));
        setMessages(prev => prev.map(m => m.id === task.id ? { ...m, delivery_status: 'failed', error_message: errorData.message || 'Server error' } : m));
      }
    } catch (err) {
      toast.error(t('toastConnectionFailure'));
      setMessages(prev => prev.map(m => m.id === task.id ? { ...m, delivery_status: 'failed', error_message: 'Connection failure' } : m));
    } finally {
      // remove the task we just processed
      messageQueueRef.current.shift();
      isSendingQueueRef.current = false;
      // Trigger next task in the queue
      processMessageQueue();
    }
  };

  // Send Action
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!messageText.trim() && !mediaFile)) return;

    const endpoint = composerMode === 'note' 
      ? `/conversations/${activeConvId}/notes` 
      : `/conversations/${activeConvId}/send`;

    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      direction: 'outbound',
      message_type: composerMode === 'note' ? 'note' : (mediaFile ? 'image' : 'text'),
      sender_identifier: currentUser?.email || 'me',
      body: messageText,
      media_url: mediaFile ? URL.createObjectURL(mediaFile) : null,
      external_message_id: null,
      delivery_status: 'sending',
      error_message: null,
      created_at: new Date().toISOString()
    };

    // Append optimistic message
    setMessages(prev => [...prev, optimisticMsg]);

    // Capture values and clear input boxes immediately for better UX
    const textToSend = messageText;
    const fileToSend = mediaFile;

    setMessageText('');
    setMediaFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      let body: BodyInit;
      
      if (composerMode === 'reply' && fileToSend) {
        const formData = new FormData();
        formData.append('body', textToSend);
        formData.append('media_file', fileToSend);
        body = formData;
      } else {
        body = JSON.stringify({
          body: textToSend
        });
      }

      // Add to FIFO queue
      messageQueueRef.current.push({
        id: tempId,
        conversationId: activeConvId,
        endpoint,
        body
      });

      // Start queue processor
      processMessageQueue();
    } catch (err) {
      toast.error(t('toastPayloadError'));
    }
  };

  // Helper to directly queue and send an outbound message (with optional media URL)
  const sendDirectOutbound = (bodyText: string, mediaUrl?: string | null) => {
    if (!activeConvId || (!bodyText.trim() && !mediaUrl)) return;
    const endpoint = `/conversations/${activeConvId}/send`;
    const tempId = -Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      direction: 'outbound',
      message_type: mediaUrl ? 'image' : 'text',
      sender_identifier: currentUser?.email || 'me',
      body: bodyText,
      media_url: mediaUrl || null,
      external_message_id: null,
      delivery_status: 'sending',
      error_message: null,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const payload: any = { body: bodyText };
    if (mediaUrl) {
      payload.media_url = mediaUrl;
    }

    messageQueueRef.current.push({
      id: tempId,
      conversationId: activeConvId,
      endpoint,
      body: JSON.stringify(payload)
    });
    processMessageQueue();
  };

  // Helper: Format Quick Reply Body with Contact, Channel & Agent variables
  const formatQuickReplyText = (body: string, contact?: Contact | null, user?: any, channel?: ChannelConnection | null) => {
    if (!body) return '';
    let text = body;
    const firstName = contact?.first_name || '';
    const lastName = contact?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || firstName || 'there';
    const email = contact?.email || '';
    const phone = contact?.phone || '';
    const company = contact?.company_name || channel?.name || '';
    const agentName = user?.first_name || user?.name || 'Support';

    return text
      .replace(/\{contact_name\}/gi, fullName)
      .replace(/\{contact\.name\}/gi, fullName)
      .replace(/\{name\}/gi, fullName)
      .replace(/\{first_name\}/gi, firstName || 'there')
      .replace(/\{contact\.first_name\}/gi, firstName || 'there')
      .replace(/\{last_name\}/gi, lastName)
      .replace(/\{contact\.last_name\}/gi, lastName)
      .replace(/\{email\}/gi, email)
      .replace(/\{contact\.email\}/gi, email)
      .replace(/\{phone\}/gi, phone)
      .replace(/\{contact\.phone\}/gi, phone)
      .replace(/\{company_name\}/gi, company)
      .replace(/\{company\}/gi, company)
      .replace(/\{agent_name\}/gi, agentName)
      .replace(/\{user_name\}/gi, agentName);
  };

  // Autocomplete suggestions for typed slash command
  const slashSuggestions = useMemo(() => {
    if (!showSlashMenu) return [];
    const q = slashQuery.toLowerCase().trim();

    const ecoActions: any[] = [];
    if (hasEcommerceIntegration) {
      if (!q || 'product'.includes(q) || 'store'.includes(q) || 'catalog'.includes(q)) {
        ecoActions.push({
          id: 'eco_action_product',
          name: '🛍️ Send Store Product',
          shortcut: '/product',
          body: 'Browse catalog products & send direct checkout link',
          _isEcommerceAction: true,
          _tab: 'products',
        });
      }
      if (!q || 'discount'.includes(q) || 'coupon'.includes(q) || 'promo'.includes(q) || 'offer'.includes(q)) {
        ecoActions.push({
          id: 'eco_action_discount',
          name: '🏷️ Create Promo Discount',
          shortcut: '/discount',
          body: 'Generate customized customer discount promo code',
          _isEcommerceAction: true,
          _tab: 'discounts',
        });
      }
    }

    const filteredReplies = quickRepliesList.filter(qr => {
      if (!qr.is_active) return false;
      // Channel compatibility
      if (activeConv?.channel_connection_id && Array.isArray(qr.channels) && qr.channels.length > 0) {
        const matchesChannel = qr.channels.some((c: any) => c.id === activeConv.channel_connection_id);
        if (!matchesChannel) return false;
      }
      if (!q) return true;
      const shortcutClean = (qr.shortcut || '').toLowerCase().replace(/^\//, '');
      const nameClean = (qr.name || '').toLowerCase();
      const bodyClean = (qr.body || '').toLowerCase();
      const keywords = Array.isArray(qr.trigger_keywords) ? qr.trigger_keywords : [];
      return (
        shortcutClean.includes(q) ||
        nameClean.includes(q) ||
        bodyClean.includes(q) ||
        keywords.some((k: string) => k.toLowerCase().includes(q))
      );
    });

    return [...ecoActions, ...filteredReplies].slice(0, 8);
  }, [quickRepliesList, showSlashMenu, slashQuery, activeConv]);

  // Insert Quick Reply into composer
  const insertQuickReply = (qr: any, matchedToken?: string) => {
    const textarea = textareaRef.current;

    if (qr._isEcommerceAction) {
      if (textarea && matchedToken !== undefined) {
        const cursorPos = textarea.selectionStart ?? messageText.length;
        const textBeforeCursor = messageText.slice(0, cursorPos);
        const textAfterCursor = messageText.slice(textarea.selectionEnd ?? cursorPos);
        const lastSlash = textBeforeCursor.lastIndexOf('/');
        if (lastSlash !== -1) {
          setMessageText(textBeforeCursor.slice(0, lastSlash) + textAfterCursor);
        }
      }
      setShowSlashMenu(false);
      setEcommerceModalTab(qr._tab);
      setShowEcommerceModal(true);
      return;
    }

    const formattedBody = formatQuickReplyText(qr.body, activeConv?.contact, currentUser, activeConv?.channel_connection);

    if (textarea) {
      const cursorPos = textarea.selectionStart ?? messageText.length;
      const textBeforeCursor = messageText.slice(0, cursorPos);
      const textAfterCursor = messageText.slice(textarea.selectionEnd ?? cursorPos);

      let tokenToReplace = '';
      if (matchedToken !== undefined) {
        tokenToReplace = `/${matchedToken}`;
      } else {
        const slashMatch = textBeforeCursor.match(/\/[a-zA-Z0-9_\-]*$/);
        if (slashMatch) tokenToReplace = slashMatch[0];
      }

      let newBefore = textBeforeCursor;
      if (tokenToReplace && textBeforeCursor.endsWith(tokenToReplace)) {
        newBefore = textBeforeCursor.slice(0, -tokenToReplace.length) + formattedBody + ' ';
      } else {
        newBefore = textBeforeCursor + formattedBody + ' ';
      }

      const newText = newBefore + textAfterCursor;
      setMessageText(newText);
      setShowSlashMenu(false);
      setSlashQuery('');
      setSlashSelectedIndex(0);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = newBefore.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
        }
      });
    } else {
      setMessageText(prev => prev.trim() ? `${prev}\n${formattedBody}` : formattedBody);
    }
  };

  // Handle Key Down in Composer (Space trigger expansion, Enter, Tab, Arrow keys)
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Navigation when Slash Menu is active
    if (showSlashMenu && slashSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex(prev => (prev + 1) % slashSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex(prev => (prev - 1 + slashSuggestions.length) % slashSuggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedQr = slashSuggestions[slashSelectedIndex] || slashSuggestions[0];
        if (selectedQr) {
          insertQuickReply(selectedQr);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    // 2. Space Trigger Expansion (User types /command and presses Space)
    if (e.key === ' ' || e.key === 'Spacebar') {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart ?? messageText.length;
        const textBeforeCursor = messageText.slice(0, cursorPos);

        // Check if text ends with a slash command token: /(?:^|\s)\/([a-zA-Z0-9_\-]+)$/
        const match = textBeforeCursor.match(/(?:^|\s)\/([a-zA-Z0-9_\-]+)$/);
        if (match) {
          const typedCmd = match[1].toLowerCase();

          // Find exact match by shortcut or keywords
          const matchedQr = quickRepliesList.find(qr => {
            if (!qr.is_active) return false;
            if (activeConv?.channel_connection_id && Array.isArray(qr.channels) && qr.channels.length > 0) {
              const matchesChannel = qr.channels.some((c: any) => c.id === activeConv.channel_connection_id);
              if (!matchesChannel) return false;
            }
            const shortcutClean = (qr.shortcut || '').toLowerCase().replace(/^\//, '');
            if (shortcutClean === typedCmd) return true;
            if (Array.isArray(qr.trigger_keywords) && qr.trigger_keywords.some((k: string) => k.toLowerCase() === typedCmd)) return true;
            return false;
          }) || (showSlashMenu && slashSuggestions.length > 0 ? slashSuggestions[slashSelectedIndex] : null);

          if (matchedQr) {
            e.preventDefault();
            insertQuickReply(matchedQr, match[1]);
            return;
          }
        }
      }
    }

    // 3. Normal Enter to Send Message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Handle Change in Composer (Detect slash commands & handle space expansion fallback)
  const handleComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart ?? val.length;

    // Check if the input contains a space pressed right after a slash command
    const textBefore = val.slice(0, cursorPos);
    const spaceSlashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_\-]+)\s$/);

    if (spaceSlashMatch) {
      const typedCmd = spaceSlashMatch[1].toLowerCase();
      const matchedQr = quickRepliesList.find(qr => {
        if (!qr.is_active) return false;
        if (activeConv?.channel_connection_id && Array.isArray(qr.channels) && qr.channels.length > 0) {
          const matchesChannel = qr.channels.some((c: any) => c.id === activeConv.channel_connection_id);
          if (!matchesChannel) return false;
        }
        const shortcutClean = (qr.shortcut || '').toLowerCase().replace(/^\//, '');
        if (shortcutClean === typedCmd) return true;
        if (Array.isArray(qr.trigger_keywords) && qr.trigger_keywords.some((k: string) => k.toLowerCase() === typedCmd)) return true;
        return false;
      });

      if (matchedQr) {
        const formattedBody = formatQuickReplyText(matchedQr.body, activeConv?.contact, currentUser, activeConv?.channel_connection);
        const tokenWithSpace = `/${spaceSlashMatch[1]} `;
        const tokenIndex = textBefore.lastIndexOf(tokenWithSpace);
        const newBefore = textBefore.slice(0, tokenIndex) + formattedBody + ' ';
        const textAfter = val.slice(cursorPos);
        const finalVal = newBefore + textAfter;
        setMessageText(finalVal);
        setShowSlashMenu(false);
        setSlashQuery('');
        setSlashSelectedIndex(0);

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            const newPos = newBefore.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
          }
        });
        return;
      }
    }

    setMessageText(val);

    // Check if cursor is currently within or at the end of a /command query
    const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_\-]*)$/);
    if (slashMatch) {
      setSlashQuery(slashMatch[1]);
      setShowSlashMenu(true);
      setSlashSelectedIndex(0);
    } else {
      if (showSlashMenu) {
        setShowSlashMenu(false);
        setSlashQuery('');
      }
    }
  };

  // Update CRM properties
  const handleUpdateContact = async () => {
    if (!activeConv || !activeConv.contact) return;

    try {
      const res = await fetchWithCsrf(`/contacts/${activeConv.contact.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          phone: editPhone,
          lifecycle_stage: editStage
        })
      });

      if (res.ok) {
        toast.success(t('toastCrmSaved'));
        fetchConversations();
      } else {
        toast.error(t('toastCrmSaveFailed'));
      }
    } catch (err) {
      toast.error(t('toastNetworkRequestFailed'));
    }
  };

  // Update routing selectors
  const handleAssigneeChange = async (userId: number | null) => {
    if (!activeConvId) return;
    try {
      const res = await fetchWithCsrf(`/conversations/${activeConvId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_user_id: userId })
      });
      if (res.ok) {
        toast.success(t('toastAssigneeUpdated'));
        fetchConversations();
      }
    } catch (err) {
      toast.error(t('toastAssigneeUpdateFailed'));
    }
  };

  const handleToggleMute = async () => {
    if (!activeConv || !activeConv.contact) return;
    setIsMuting(true);
    try {
      const newMuteState = !activeConv.contact.is_muted;
      const res = await fetchWithCsrf(`/contacts/${activeConv.contact.id}/mute`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_muted: newMuteState }),
      });
      if (res.ok) {
        const updatedContact = await res.json();
        setConversations(prev => prev.map(c => {
          if (c.contact && c.contact.id === updatedContact.id) {
            return { ...c, contact: { ...c.contact, is_muted: updatedContact.is_muted } } as Conversation;
          }
          return c;
        }));
        toast.success(newMuteState ? t('toastMutedSuccess') : t('toastUnmutedSuccess'));
      } else {
        toast.error(t('toastMuteFailed'));
      }
    } catch {
      toast.error(t('toastMuteNetworkError'));
    } finally {
      setIsMuting(false);
      setActionsDropdownOpen(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeConvId) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithCsrf(`/conversations/${activeConvId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(t('toastDeleteSuccess'));
        setConversations(prev => prev.filter(c => c.id !== activeConvId));
        setActiveConvId(null);
        setDeleteConfirmOpen(false);
        setActionsDropdownOpen(false);
      } else {
        toast.error(t('toastDeleteFailed'));
      }
    } catch {
      toast.error(t('toastDeleteNetworkError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTeamChange = async (teamId: number | null) => {
    if (!activeConvId) return;
    try {
      const res = await fetchWithCsrf(`/conversations/${activeConvId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_team_id: teamId })
      });
      if (res.ok) {
        toast.success(t('toastTeamUpdated'));
        fetchConversations();
      }
    } catch (err) {
      toast.error(t('toastTeamUpdateFailed'));
    }
  };

  const handleStatusChange = async (status: 'open' | 'pending' | 'resolved') => {
    if (!activeConvId) return;
    try {
      const res = await fetchWithCsrf(`/conversations/${activeConvId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(t('toastMarkedStatus', { status }));
        fetchConversations();
        if (status !== statusTab) {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      toast.error(t('toastStatusUpdateFailed'));
    }
  };

  const handleAiToggle = async (checked: boolean) => {
    if (!activeConvId) return;
    try {
      const res = await fetchWithCsrf(`/conversations/${activeConvId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ai_active: checked })
      });
      if (res.ok) {
        toast.success(checked ? t('toastAiEnabled') : t('toastAiPaused'));
        fetchConversations();
      }
    } catch (err) {
      toast.error(t('toastAiUpdateFailed'));
    }
  };

  // Tag list handles
  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagText.trim() && activeConv && activeConv.contact) {
      const currentTags = activeConv.contact.tags || [];
      if (!currentTags.includes(newTagText.trim())) {
        const updatedTags = [...currentTags, newTagText.trim()];
        try {
          const res = await fetchWithCsrf(`/contacts/${activeConv.contact.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              first_name: activeConv.contact.first_name,
              lifecycle_stage: activeConv.contact.lifecycle_stage,
              tags: updatedTags
            })
          });
          if (res.ok) {
            setNewTagText('');
            fetchConversations();
          }
        } catch (err) {}
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (activeConv && activeConv.contact) {
      const currentTags = activeConv.contact.tags || [];
      const updatedTags = currentTags.filter(t => t !== tagToRemove);
      try {
        const res = await fetchWithCsrf(`/contacts/${activeConv.contact.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            first_name: activeConv.contact.first_name,
            lifecycle_stage: activeConv.contact.lifecycle_stage,
            tags: updatedTags
          })
        });
        if (res.ok) {
          fetchConversations();
        }
      } catch (err) {}
    }
  };

  // Formatting helpers
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateDivider = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  // Filter conversations locally based on search input
  const filteredConversations = conversations.filter(c => {
    const contactName = `${c.contact?.first_name || ''} ${c.contact?.last_name || ''}`.toLowerCase();
    const phone = (c.contact?.phone || '').toLowerCase();
    const email = (c.contact?.email || '').toLowerCase();
    const lastMsg = (c.last_message?.body || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return contactName.includes(query) || phone.includes(query) || email.includes(query) || lastMsg.includes(query);
  });

  const getChannelLogo = (type: string, className = "h-4 w-4") => {
    const cleanType = (type || '').toLowerCase();
    switch (cleanType) {
      case 'whatsapp':
      case 'whatsapp_baileys':
      case 'whatsapp_cloud':
        return <img src="/channels/whatsapp.webp" alt="WhatsApp" className={`${className} object-contain`} />;
      case 'telegram':
        return <img src="/channels/telegram.webp" alt="Telegram" className={`${className} object-contain`} />;
      case 'instagram':
        return <img src="/channels/instagram.svg" alt="Instagram" className={`${className} object-contain`} />;
      case 'tiktok':
        return <img src="/channels/tiktok.webp" alt="TikTok" className={`${className} object-contain`} />;
      case 'messenger':
        return <img src="/channels/messenger.webp" alt="Messenger" className={`${className} object-contain`} />;
      case 'email':
        return (
          <svg className={`${className} text-rose-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        );
      case 'sms':
        return <img src="/channels/twilio.svg" alt="SMS" className={`${className} object-contain`} />;
      default:
        return (
          <svg className={`${className} text-zinc-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white">
      <div className="flex-1 flex h-full items-stretch overflow-hidden bg-white">
        
        {/* PANEL 1: CONVERSATIONS LIST */}
        <div className={`${activeConvId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-[#E8E8E6] flex-col h-full bg-white shrink-0 overflow-hidden`}>
          {/* Header search & assignee filters */}
          <div className="p-4 border-b border-[#E8E8E6] bg-white flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder={t('searchConversations')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 h-9 text-xs border border-[#E8E8E6] rounded-md bg-[#F5F5F5] focus:outline-none focus:bg-white focus:border-zinc-955 placeholder:text-zinc-400 transition-all font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setStartChatOpen(true);
                }}
                title={tCommon('create')}
                className="h-9 w-9 rounded-md border border-[#E8E8E6] bg-white flex items-center justify-center text-zinc-650 hover:bg-[#FAFAFA] hover:text-black transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex gap-2 items-center justify-between relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t('assignee')}</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAssigneeDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E8E6] rounded-md text-[10px] font-bold bg-[#FAF9F6] text-black hover:bg-zinc-50 transition-all select-none cursor-pointer"
                >
                  <span>
                    {assigneeFilter === 'all' ? t('allAssignees') :
                     assigneeFilter === 'me' ? t('assignedToMe') : t('unassigned')}
                  </span>
                  <svg className={`h-3 w-3 text-zinc-400 transition-transform ${assigneeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {assigneeDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E8E8E6] rounded-md shadow-lg z-50 py-1">
                    {(['all', 'me', 'unassigned'] as const).map(option => (
                      <button
                        key={option}
                        onClick={() => {
                          setAssigneeFilter(option);
                          setAssigneeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-all hover:bg-zinc-50 ${assigneeFilter === option ? 'text-black bg-zinc-50 font-bold' : 'text-zinc-600'}`}
                      >
                        {option === 'all' ? t('allAssignees') :
                         option === 'me' ? t('assignedToMe') : t('unassigned')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Filters */}
          <div className="flex border-b border-[#E8E8E6] bg-white">
            <button
              onClick={() => setStatusTab('open')}
              className={`flex-1 text-center py-2.5 text-xs font-semibold border-b-2 transition-all ${statusTab === 'open' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              {tCommon('statusOpen')}
            </button>
            <button
              onClick={() => setStatusTab('pending')}
              className={`flex-1 text-center py-2.5 text-xs font-semibold border-b-2 transition-all ${statusTab === 'pending' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              {tCommon('statusPending')}
            </button>
            <button
              onClick={() => setStatusTab('resolved')}
              className={`flex-1 text-center py-2.5 text-xs font-semibold border-b-2 transition-all ${statusTab === 'resolved' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              {tCommon('statusResolved')}
            </button>
          </div>

          {/* Conversation List ScrollArea */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E6]/60">
            {currentUser?.channel_access_type === 'custom' && (currentUser?.accessible_channel_ids?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 my-auto">
                <div className="h-10 w-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <span className="text-xs font-bold text-zinc-900 mb-1">{t('noChannelsAssignedInboxTitle')}</span>
                <span className="text-[11px] text-zinc-400 max-w-[220px] leading-relaxed">
                  {t('noChannelsAssignedInboxDesc')}
                </span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                <MessageSquare className="h-8 w-8 mb-2 stroke-1" />
                <span className="text-xs font-medium">{t('noChatsFound')}</span>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = conv.id === activeConvId;
                const contactName = `${conv.contact?.first_name || 'New Chat'} ${conv.contact?.last_name || ''}`;
                const hasUnread = (conv.unread_count || 0) > 0;
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`flex gap-3 p-4 hover:bg-muted/30 cursor-pointer transition-colors relative ${isActive ? 'bg-[#F4F4F2]' : 'bg-white'}`}
                  >
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-semibold border border-zinc-200">
                        {conv.contact?.first_name?.[0] || 'N'}
                      </div>
                      {/* Channel Icon Badge */}
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 flex items-center justify-center bg-transparent">
                        {getChannelLogo(conv.channel_connection?.channel_type || '', "h-4.5 w-4.5")}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-xs font-bold truncate flex items-center gap-1.5 ${hasUnread ? 'text-black' : 'text-zinc-800'}`}>
                          {contactName}
                          {conv.contact?.is_muted && (
                            <span title={t('titles.muted')}><VolumeX className="h-3 w-3 text-zinc-400 shrink-0" /></span>
                          )}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      
                      <p className={`text-xs truncate ${hasUnread ? 'text-black font-semibold' : 'text-zinc-500'}`}>
                        {conv.last_message?.message_type === 'note' ? (
                          <span className="text-amber-600 italic font-medium flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Note: {conv.last_message?.body}
                          </span>
                        ) : (
                          conv.last_message?.body || 'No messages yet'
                        )}
                      </p>

                      {/* Display tags */}
                      {conv.contact?.tags && conv.contact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {conv.contact.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[8px] px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Unread dot */}
                    {hasUnread && (
                      <div className="absolute right-4 bottom-4 h-2 w-2 rounded-full bg-black" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: ACTIVE MESSAGE THREAD */}
        <div className={`${activeConvId ? 'flex' : 'hidden md:flex'} flex-1 flex-col h-full bg-white min-w-0 overflow-hidden`}>
          {activeConv ? (
            <React.Fragment>
              {/* Thread Header */}
              <div className="p-3 sm:p-4 border-b border-[#E8E8E6] flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveConvId(null)}
                    className="h-8 w-8 rounded-lg flex md:hidden items-center justify-center text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 shrink-0 text-xs sm:text-sm">
                    {activeConv.contact?.first_name?.[0] || 'N'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-black flex items-center gap-1.5 truncate">
                      <span className="truncate">{`${activeConv.contact?.first_name || 'New Chat'} ${activeConv.contact?.last_name || ''}`}</span>
                      <span className="text-[10px] font-normal text-zinc-400 shrink-0 hidden sm:inline">({activeConv.external_chat_id})</span>
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 bg-transparent shrink-0">
                        {getChannelLogo(activeConv.channel_connection?.channel_type || '', "h-3.5 w-3.5 sm:h-4.5 sm:w-4.5")}
                      </span>
                      <span className="truncate">{activeConv.channel_connection?.name || 'Channel'}</span>
                    </p>
                  </div>
                </div>

                {/* Routing & Action select dropdowns */}
                <div className="flex items-center gap-2">
                  {/* Assign User selector */}
                  <div className="flex items-center gap-2 relative">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('assigneeHeader')}</span>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAssigneeHeaderDropdownOpen(prev => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E8E8E6] rounded-md text-[10px] font-bold bg-[#FAF9F6] text-black hover:bg-zinc-50 transition-all select-none cursor-pointer"
                      >
                        <span>
                          {activeConv.assigned_user_id 
                            ? members.find(m => m.id === activeConv.assigned_user_id)
                              ? `${members.find(m => m.id === activeConv.assigned_user_id)?.first_name} ${members.find(m => m.id === activeConv.assigned_user_id)?.last_name}`
                              : t('assigned')
                            : t('unassigned')}
                        </span>
                        <svg className={`h-3 w-3 text-zinc-400 transition-transform ${assigneeHeaderDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                    {assigneeHeaderDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E8E8E6] rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            handleAssigneeChange(null);
                            setAssigneeHeaderDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-all hover:bg-zinc-50 ${!activeConv.assigned_user_id ? 'text-black bg-zinc-50 font-bold' : 'text-zinc-600'}`}
                        >
                          {t('unassigned')}
                        </button>
                        {members.map(m => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              handleAssigneeChange(m.id);
                              setAssigneeHeaderDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-all hover:bg-zinc-50 ${activeConv.assigned_user_id === m.id ? 'text-black bg-zinc-50 font-bold' : 'text-zinc-600'}`}
                          >
                            {m.first_name} {m.last_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActionsDropdownOpen(prev => !prev)}
                      className="h-8 w-8 rounded-md border border-[#E8E8E6] bg-white flex items-center justify-center text-zinc-600 hover:bg-[#FAFAFA] hover:text-black transition-colors select-none cursor-pointer"
                      title={t('conversationActions')}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {actionsDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E8E8E6] rounded-[6px] shadow-md z-50 py-1 font-sans">
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          disabled={isMuting}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-black hover:bg-zinc-50 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {activeConv.contact?.is_muted ? (
                            <>
                              <Volume2 className="h-3.5 w-3.5" />
                              <span>{t('unmuteContact')}</span>
                            </>
                          ) : (
                            <>
                              <VolumeX className="h-3.5 w-3.5" />
                              <span>{t('muteContact')}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmOpen(true);
                            setActionsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50/50 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>{t('deleteChat')}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Show Contact Details Info Button (only rendered when sidebar is closed) */}
                  {!showContactSidebar && (
                    <button
                      type="button"
                      onClick={() => setShowContactSidebar(true)}
                      className="h-8 w-8 rounded-md border border-[#E8E8E6] bg-white flex items-center justify-center text-zinc-600 hover:bg-[#FAFAFA] hover:text-black transition-colors select-none cursor-pointer"
                      title={t('showContactDetails') || 'Show Contact Details'}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message thread panel with floating scroll to bottom button */}
              <div className="flex-1 relative min-h-0 bg-white flex flex-col">
                <div 
                  ref={chatContainerRef}
                  onScroll={handleChatScroll}
                  className="flex-1 overflow-y-auto p-4 md:p-6 bg-white space-y-3"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400 select-none">
                      <div className="h-12 w-12 rounded-full bg-zinc-50 border border-[#E8E8E6] flex items-center justify-center mb-3 shadow-3xs">
                        <MessageSquare className="h-5 w-5 text-zinc-400 stroke-[1.5]" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 tracking-tight">{t('noChatsFound')}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">{t('typeMessageResponse')}</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isInbound = msg.direction === 'inbound';
                      const isNote = msg.message_type === 'note';

                      // Determine if date divider is needed
                      const showDateDivider = index === 0 || 
                        (messages[index - 1]?.created_at && new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString());

                      if (isNote) {
                        return (
                          <React.Fragment key={`note-wrap-${msg.id}-${index}`}>
                            {showDateDivider && (
                              <div className="flex items-center justify-center my-4 select-none">
                                <div className="flex items-center gap-2">
                                  <div className="h-[1px] w-8 bg-zinc-200" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-white border border-[#E8E8E6] px-2.5 py-0.5 rounded-full shadow-3xs">
                                    {formatDateDivider(msg.created_at)}
                                  </span>
                                  <div className="h-[1px] w-8 bg-zinc-200" />
                                </div>
                              </div>
                            )}
                            <div className="flex justify-center my-3 max-w-[85%] mx-auto select-text">
                              <div className="bg-[#FEFCE8] border border-amber-200/90 text-amber-950 rounded-xl px-4 py-3 text-xs w-full shadow-2xs">
                                <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1.5 border-b border-amber-200/60 text-amber-900 font-bold text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>{t('internalNote')}</span>
                                  </div>
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    {msg.sender_identifier || 'Agent'}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed text-amber-900 font-normal">{msg.body}</p>
                                <span className="text-[10px] text-amber-600/90 block text-right mt-1.5 font-medium">{formatTime(msg.created_at)}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      }

                      return (
                        <React.Fragment key={`msg-wrap-${msg.id}-${index}`}>
                          {showDateDivider && (
                            <div className="flex items-center justify-center my-4 select-none">
                              <div className="flex items-center gap-2">
                                <div className="h-[1px] w-8 bg-zinc-200" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-white border border-[#E8E8E6] px-2.5 py-0.5 rounded-full shadow-3xs">
                                  {formatDateDivider(msg.created_at)}
                                </span>
                                <div className="h-[1px] w-8 bg-zinc-200" />
                              </div>
                            </div>
                          )}

                          <div 
                            className={`flex gap-2.5 max-w-[80%] md:max-w-[70%] group relative mb-2.5 ${isInbound ? 'items-end' : 'ml-auto flex-row-reverse items-end'}`}
                          >
                            {isInbound && (
                              <div className="h-7 w-7 rounded-full bg-zinc-100 border border-[#E8E8E6] flex items-center justify-center text-[11px] font-bold text-zinc-700 shrink-0 select-none shadow-3xs">
                                {activeConv.contact?.first_name?.[0] || activeConv.contact?.last_name?.[0] || 'C'}
                              </div>
                            )}

                            <div className={`flex flex-col relative group/bubble ${isInbound ? 'items-start' : 'items-end'}`}>
                              {/* Hover quick copy button */}
                              {msg.body && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.body || '');
                                    toast.success(t('trackingNumberCopied'));
                                  }}
                                  className={`absolute top-1 ${isInbound ? '-right-7' : '-left-7'} opacity-0 group-hover/bubble:opacity-100 transition-opacity h-6 w-6 rounded-md bg-white border border-[#E8E8E6] text-zinc-400 hover:text-zinc-900 flex items-center justify-center shadow-2xs cursor-pointer z-10`}
                                  title={t('copy') || 'Copy'}
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}

                              <div className={`rounded-2xl px-4 py-2.5 shadow-2xs text-xs leading-relaxed ${
                                isInbound 
                                  ? 'bg-[#F9F9F8] text-zinc-900 rounded-bl-xs border border-[#E8E8E6]' 
                                  : 'bg-zinc-950 text-white rounded-br-xs'
                              }`}>
                                {/* AI Copilot Badge */}
                                {!isInbound && (msg.sender_type === 'ai' || msg.sender_type === 'bot' || (msg as any).is_ai) && (
                                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-zinc-800 text-[10px] font-bold text-[#4AE54A] select-none">
                                    <Sparkles className="h-3 w-3 text-[#4AE54A]" />
                                    <span>{t('aiCopilot')}</span>
                                  </div>
                                )}

                                {/* Media / Attachment Rendering */}
                                {msg.media_url && (
                                  <div className="mb-2 max-w-full rounded-lg overflow-hidden">
                                    {(() => {
                                      const resolvedUrl = getMediaUrl(msg.media_url);
                                      const ext = resolvedUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
                                      const isImg = msg.message_type === 'image' || msg.message_type === 'photo' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                                      const isVideo = msg.message_type === 'video' || ['mp4', 'webm', 'ogg'].includes(ext);

                                      if (isImg) {
                                        return (
                                          <div 
                                            className="bg-black/5 rounded-lg overflow-hidden cursor-zoom-in group/img relative"
                                            onClick={() => setActiveMediaPreviewUrl(resolvedUrl)}
                                          >
                                            <img src={resolvedUrl} alt="Attachment" className="max-h-64 object-contain w-full rounded-lg hover:opacity-95 transition-opacity" />
                                          </div>
                                        );
                                      }
                                      
                                      if (isVideo) {
                                        return (
                                          <div className="relative group/vid cursor-zoom-in rounded-lg overflow-hidden bg-black">
                                            <video src={resolvedUrl} className="max-h-64 w-full rounded-lg" />
                                            <div 
                                              className="absolute inset-0 bg-black/40 opacity-0 group-hover/vid:opacity-100 transition-all flex items-center justify-center"
                                              onClick={() => setActiveMediaPreviewUrl(resolvedUrl)}
                                            >
                                              <span className="text-white text-[10px] font-bold bg-black/70 px-2.5 py-1 rounded-md select-none">{t('clickToPlay')}</span>
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Document Link Card
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => setActiveMediaPreviewUrl(resolvedUrl)}
                                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer w-full text-left shadow-3xs ${
                                            isInbound 
                                              ? 'bg-white border-[#E8E8E6] text-zinc-900 hover:bg-zinc-100/60' 
                                              : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
                                          }`}
                                        >
                                          <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${isInbound ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-800 text-zinc-300'}`}>
                                            <FileText className="h-4 w-4" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate">
                                              {resolvedUrl.split('/').pop()?.split('?')[0] || 'Document'}
                                            </p>
                                            <p className="text-[9px] text-zinc-400">{t('clickToPreviewDoc')}</p>
                                          </div>
                                        </button>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* WhatsApp Flow Outbound Message Card */}
                                {(msg.message_type === 'whatsapp_flow' || msg.message_type === 'flow') ? (
                                  <div className="w-full min-w-[240px] max-w-[320px] bg-white border border-[#E8E8E6] rounded-xl overflow-hidden shadow-sm text-left my-1">
                                    <div className="bg-[#FAF9F6] border-b border-[#E8E8E6] px-3 py-2 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <div className="h-5 w-5 rounded-md bg-[#E8FDE8] border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
                                          <FormInput className="h-3 w-3" />
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-800 tracking-tight truncate max-w-[170px]">
                                          {msg.metadata?.flow_name || 'WhatsApp Flow Form'}
                                        </span>
                                      </div>
                                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                        Flow
                                      </span>
                                    </div>
                                    
                                    <div className="p-3 space-y-2">
                                      {msg.metadata?.header && (
                                        <p className="text-[11px] font-bold text-zinc-900 border-b border-zinc-100 pb-1">
                                          {msg.metadata.header}
                                        </p>
                                      )}
                                      <p className="text-[11px] text-zinc-700 leading-relaxed font-normal whitespace-pre-wrap">
                                        {msg.body}
                                      </p>
                                      {msg.metadata?.footer && (
                                        <p className="text-[9px] text-zinc-400 italic">
                                          {msg.metadata.footer}
                                        </p>
                                      )}

                                      {/* Interactive CTA Button Preview */}
                                      <div className="pt-1.5 border-t border-[#E8E8E6]/70">
                                        <div className="w-full bg-[#E8FDE8] border border-[#25D366]/30 text-[#075E54] text-[11px] font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-3xs select-none">
                                          <FormInput className="h-3 w-3 text-[#25D366]" />
                                          <span>{msg.metadata?.flow_cta || 'Open Form'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : msg.message_type === 'flow_response' ? (
                                  <div className="w-full min-w-[260px] max-w-[340px] bg-white border border-emerald-200 rounded-xl overflow-hidden shadow-sm text-left my-1">
                                    <div className="bg-[#E8FDE8]/60 border-b border-emerald-200/80 px-3 py-2 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span className="text-[11px] font-bold text-emerald-950 truncate max-w-[190px]">
                                          {msg.metadata?.flow_name ? `${msg.metadata.flow_name}` : 'Flow Response'}
                                        </span>
                                      </div>
                                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                        Submitted
                                      </span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      {msg.metadata?.answers && typeof msg.metadata.answers === 'object' && Object.keys(msg.metadata.answers).length > 0 ? (
                                        <div className="space-y-1.5">
                                          {Object.entries(msg.metadata.answers).map(([key, val]) => (
                                            <div key={key} className="bg-zinc-50 border border-[#E8E8E6] rounded-md p-2 flex flex-col gap-0.5">
                                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                                                {key.replace(/_/g, ' ')}
                                              </span>
                                              <span className="text-[11px] font-semibold text-zinc-900 break-words">
                                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-zinc-800 whitespace-pre-wrap font-medium">
                                          {msg.body || 'Form submitted by customer.'}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  msg.body && (
                                    <p className="whitespace-pre-wrap leading-relaxed break-words font-normal">
                                      {msg.body}
                                    </p>
                                  )
                                )}
                                
                                {/* Message Footer: Time + Status */}
                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium select-none ${isInbound ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                  <span>{formatTime(msg.created_at)}</span>
                                  {!isInbound && (
                                    msg.delivery_status === 'sending' ? (
                                      <Clock className="h-3 w-3 text-zinc-400 animate-spin" />
                                    ) : msg.delivery_status === 'read' ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-[#4AE54A]" />
                                    ) : msg.delivery_status === 'delivered' ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
                                    ) : msg.delivery_status === 'failed' ? (
                                      <span className="text-rose-400 font-bold text-[10px] cursor-help" title={msg.error_message || 'Failed to deliver message'}>!</span>
                                    ) : (
                                      <Check className="h-3.5 w-3.5 text-zinc-400" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Scroll to Bottom Button */}
                {showScrollBottom && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom('smooth')}
                    className="absolute bottom-4 right-6 z-20 h-9 w-9 rounded-full bg-white border border-[#E8E8E6] text-zinc-700 hover:text-black hover:bg-zinc-50 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 animate-in fade-in zoom-in cursor-pointer group"
                    title={t('scrollToBottom')}
                  >
                    <ChevronDown className="h-4 w-4 text-zinc-600 group-hover:text-black transition-transform group-hover:translate-y-0.5" />
                  </button>
                )}
              </div>

              {/* Bottom reply/note composer */}
              <div className="border-t border-[#E8E8E6] p-4 bg-white shrink-0">
                <form onSubmit={handleSendMessage}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-1 border border-[#E8E8E6] rounded p-0.5 bg-[#FAF9F6]">
                      <button
                        type="button"
                        onClick={() => setComposerMode('reply')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${composerMode === 'reply' ? 'bg-black text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
                      >
                        {t('reply')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposerMode('note')}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${composerMode === 'note' ? 'bg-black text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
                      >
                        {t('note')}
                      </button>
                    </div>

                    {/* Status Switcher relocated to the top-right of the composer */}
                    <div className="flex items-center gap-3 text-[10px] font-bold">
                      {pendingStatusChange ? (
                        <div className="flex items-center gap-2 bg-[#F9F9F8] border border-[#E8E8E6] rounded-lg px-2.5 py-1 shadow-sm animate-fade-in">
                          <span className="text-zinc-600 font-semibold select-none">
                            {t('changeStatusTo', { status: getStatusLabel(pendingStatusChange) })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              handleStatusChange(pendingStatusChange);
                              setPendingStatusChange(null);
                            }}
                            className="bg-zinc-955 hover:bg-zinc-900 text-white px-2 py-0.5 rounded-[4px] text-[9px] font-semibold transition-all shadow-3xs cursor-pointer"
                          >
                            {tCommon('confirm')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingStatusChange(null)}
                            className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 px-2 py-0.5 rounded-[4px] text-[9px] font-semibold transition-all cursor-pointer shadow-3xs"
                          >
                            {tCommon('cancel')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <span className="text-zinc-400 uppercase tracking-wider text-[9px] select-none">{tCommon('status')}:</span>
                          <div className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border flex items-center gap-1.5 select-none ${
                            activeConv.status === 'open' ? 'bg-[#E8FDE8] text-[#25D366] border-[#25D366]/20' :
                            activeConv.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              activeConv.status === 'open' ? 'bg-[#25D366]' :
                              activeConv.status === 'pending' ? 'bg-amber-500' : 'bg-zinc-400'
                            }`} />
                            <span>{getStatusLabel(activeConv.status)}</span>
                          </div>
                          
                          <div className="h-4 w-px bg-[#E8E8E6]" />
                          
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 text-[9px] select-none">{t('mark')}:</span>
                            {activeConv.status !== 'open' && (
                              <button
                                type="button"
                                onClick={() => setPendingStatusChange('open')}
                                className="bg-white hover:bg-[#E8FDE8] hover:text-[#25D366] hover:border-[#25D366]/30 border border-[#E8E8E6] text-zinc-500 px-2 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer shadow-sm"
                              >
                                {tCommon('statusOpen')}
                              </button>
                            )}
                            {activeConv.status !== 'pending' && (
                              <button
                                type="button"
                                onClick={() => setPendingStatusChange('pending')}
                                className="bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 border border-[#E8E8E6] text-zinc-500 px-2 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer shadow-sm"
                              >
                                {tCommon('statusPending')}
                              </button>
                            )}
                            {activeConv.status !== 'resolved' && (
                              <button
                                type="button"
                                onClick={() => setPendingStatusChange('resolved')}
                                className="bg-white hover:bg-zinc-100 hover:text-zinc-800 hover:border-zinc-300 border border-[#E8E8E6] text-zinc-500 px-2 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer shadow-sm"
                              >
                                {tCommon('statusResolved')}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {mediaFile && (
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-[#E8E8E6] group mb-2 shadow-sm animate-fade-in shrink-0 bg-[#FAF9F6]">
                      {mediaFile.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(mediaFile)}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-1 text-center bg-zinc-50">
                          <FileText className="h-4 w-4 text-zinc-500" />
                          <span className="text-[7px] font-extrabold text-zinc-600 truncate max-w-full px-1 mt-0.5">
                            {mediaFile.name}
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-1 right-1 bg-black/75 hover:bg-red-600 text-white rounded-full p-0.5 transition-all shadow-md cursor-pointer flex items-center justify-center"
                        title={t('removeAttachment')}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    {/* Floating Slash Command Autocomplete Popover */}
                    {showSlashMenu && slashSuggestions.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-white border border-[#E8E8E6] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50/90 border-b border-[#E8E8E6]">
                          <div className="flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-[11px] font-bold text-zinc-700">{t('quickReplies')}</span>
                            <span className="text-[10px] text-zinc-500 font-semibold bg-zinc-200/70 px-1.5 py-0.5 rounded-full">
                              {slashSuggestions.length}
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-400 font-medium">
                            {t('quickReplyKeyboardHint')}
                          </span>
                        </div>

                        <div className="max-h-52 overflow-y-auto divide-y divide-[#E8E8E6]/60 p-1">
                          {slashSuggestions.map((qr, index) => {
                            const isSelected = index === slashSelectedIndex;
                            return (
                              <div
                                key={qr.id}
                                onMouseEnter={() => setSlashSelectedIndex(index)}
                                onClick={() => insertQuickReply(qr, slashQuery)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-left ${
                                  isSelected ? 'bg-amber-50/70 border border-amber-200/80' : 'hover:bg-zinc-50 border border-transparent'
                                }`}
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-900' : 'text-zinc-800'}`}>
                                      {qr.name}
                                    </span>
                                    {qr.shortcut && (
                                      <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-200">
                                        /{qr.shortcut.replace(/^\//, '')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-500 truncate mt-0.5 font-normal">
                                    {formatQuickReplyText(qr.body, activeConv?.contact, currentUser, activeConv?.channel_connection)}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="shrink-0 flex items-center text-[10px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                                    <span>{t('insert')}</span>
                                    <CornerDownLeft className="h-3 w-3 ml-1" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <textarea
                      ref={textareaRef}
                      placeholder={composerMode === 'note' ? t('writeInternalNote') : t('typeMessageResponse')}
                      value={messageText}
                      onChange={handleComposerChange}
                      onKeyDown={handleComposerKeyDown}
                      className="w-full min-h-[70px] max-h-[140px] resize-none px-3 py-2 text-xs border border-[#E8E8E6] rounded-lg focus:outline-none focus:ring-1 focus:ring-black placeholder:text-zinc-400 bg-[#FAF9F6]"
                    />
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-1.5 text-zinc-400">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 hover:text-zinc-700" 
                        title={t('attachFile')}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setMediaFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        accept="image/*,video/*,application/pdf"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-1 hover:text-zinc-700 rounded transition-all flex items-center justify-center ${showEmojiPicker ? 'text-black bg-zinc-100' : ''}`}
                          title={t('titles.emoji')}
                        >
                          <Smile className="h-4 w-4" />
                        </button>

                        {showEmojiPicker && (
                          <div className="absolute bottom-8 left-0 w-64 bg-white border border-[#E8E8E6] rounded-xl shadow-lg z-50 p-3 select-none">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#E8E8E6]">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('selectEmoji')}</span>
                              <button
                                type="button"
                                onClick={() => setShowEmojiPicker(false)}
                                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                              >
                                &times;
                              </button>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                              {CATEGORIZED_EMOJIS.map(cat => (
                                <div key={cat.category}>
                                  <div className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-wide mb-1">
                                    {cat.category}
                                  </div>
                                  <div className="grid grid-cols-8 gap-1">
                                    {cat.emojis.map(emoji => (
                                      <button
                                        type="button"
                                        key={emoji}
                                        onClick={() => {
                                          setMessageText(prev => prev + emoji);
                                          setShowEmojiPicker(false);
                                        }}
                                        className="text-base hover:bg-zinc-100 p-0.5 rounded transition-all flex items-center justify-center cursor-pointer border-0"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowQuickRepliesPopup(!showQuickRepliesPopup)}
                          className={`p-1 hover:text-amber-600 rounded transition-all flex items-center justify-center ${showQuickRepliesPopup ? 'text-amber-500 bg-amber-50' : ''}`}
                          title={t('quickRepliesShortcut')}
                        >
                          <Zap className="h-4 w-4" />
                        </button>

                        {showQuickRepliesPopup && (
                          <div className="absolute bottom-8 left-0 w-80 bg-white border border-[#E8E8E6] rounded-xl shadow-xl z-50 p-3 select-none animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#E8E8E6]">
                              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                                <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                <span>{t('quickReplies')}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowQuickRepliesPopup(false)}
                                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                              >
                                &times;
                              </button>
                            </div>

                            <div className="relative mb-2">
                              <Search className="absolute left-2.5 top-2 h-3 w-3 text-zinc-400" />
                              <input
                                type="text"
                                placeholder={t('searchQuickReplies')}
                                value={quickReplyFilter}
                                onChange={e => setQuickReplyFilter(e.target.value)}
                                className="w-full pl-7 pr-2 py-1 text-xs bg-[#FAF9F6] border border-[#E8E8E6] rounded-md focus:outline-none focus:border-black font-medium"
                              />
                            </div>

                            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#E8E8E6]/50">
                              {quickRepliesList.filter(qr => {
                                if (!qr.is_active) return false;
                                if (!quickReplyFilter.trim()) return true;
                                const q = quickReplyFilter.toLowerCase();
                                return (
                                  qr.name.toLowerCase().includes(q) ||
                                  qr.shortcut?.toLowerCase().includes(q) ||
                                  qr.body.toLowerCase().includes(q) ||
                                  qr.trigger_keywords?.some((k: string) => k.toLowerCase().includes(q))
                                );
                              }).length === 0 ? (
                                <p className="text-[11px] text-zinc-400 text-center py-4 italic">
                                  {t('noQuickRepliesFound')}
                                </p>
                              ) : (
                                quickRepliesList
                                  .filter(qr => {
                                    if (!qr.is_active) return false;
                                    if (!quickReplyFilter.trim()) return true;
                                    const q = quickReplyFilter.toLowerCase();
                                    return (
                                      qr.name.toLowerCase().includes(q) ||
                                      qr.shortcut?.toLowerCase().includes(q) ||
                                      qr.body.toLowerCase().includes(q) ||
                                      qr.trigger_keywords?.some((k: string) => k.toLowerCase().includes(q))
                                    );
                                  })
                                  .map(qr => (
                                    <div
                                      key={qr.id}
                                      onClick={() => {
                                        insertQuickReply(qr);
                                        setShowQuickRepliesPopup(false);
                                        setQuickReplyFilter('');
                                      }}
                                      className="pt-1.5 pb-1 px-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors text-left group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-zinc-800 group-hover:text-black truncate">
                                          {qr.name}
                                        </span>
                                        {qr.shortcut && (
                                          <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-600 px-1 rounded">
                                            /{qr.shortcut.replace(/^\//, '')}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5 font-normal">
                                        {formatQuickReplyText(qr.body, activeConv?.contact, currentUser, activeConv?.channel_connection)}
                                      </p>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button type="button" className="p-1 hover:text-emerald-600" title={t('aiCopilotAssistance')}>
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                      </button>

                      {/* Send WhatsApp Flow Form Button */}
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowWhatsAppFlowModal(true);
                        }}
                        className="p-1 hover:text-emerald-600 text-zinc-400 hover:bg-zinc-100 rounded transition-all flex items-center justify-center cursor-pointer" 
                        title={t('sendWhatsAppFlowForm')}
                      >
                        <FormInput className="h-4 w-4 text-emerald-600" />
                      </button>

                      {/* E-Commerce Store Catalog & Special Offer Actions Button */}
                      {hasEcommerceIntegration && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowEcommerceModal(true);
                          }}
                          className="p-1 hover:text-black text-zinc-400 hover:bg-zinc-100 rounded transition-all flex items-center justify-center cursor-pointer" 
                          title={t('ecommerceCatalog')}
                        >
                          <ShoppingBag className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!messageText.trim() && !mediaFile}
                      className="bg-zinc-955 hover:bg-zinc-900 text-white text-xs font-semibold h-8 px-4 rounded-[6px] shadow-3xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="h-3 w-3" /> {t('sendReply')}
                    </button>
                  </div>
                </form>
              </div>
            </React.Fragment>
          ) : currentUser?.channel_access_type === 'custom' && (currentUser?.accessible_channel_ids?.length ?? 0) === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-white p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3 text-zinc-500">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold text-zinc-800 mb-1">{t('noChannelsAssignedInboxTitle')}</h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{t('noChannelsAssignedInboxDesc')}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-white">
              <MessageSquare className="h-12 w-12 mb-3 stroke-1" />
              <h2 className="text-sm font-bold text-zinc-700 mb-1">{t('title')}</h2>
              <p className="text-xs text-zinc-400">{t('desc')}</p>
            </div>
          )}
        </div>

        {/* PANEL 3: CONTACT & CRM DETAILS SIDEBAR */}
        {showContactSidebar && (
          <React.Fragment>
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-overlay-fade"
              onClick={() => setShowContactSidebar(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 md:relative w-[320px] max-w-[85vw] md:w-80 border-l border-[#E8E8E6] flex flex-col h-full bg-white shrink-0 overflow-hidden shadow-2xl md:shadow-none transition-all duration-300">
            {/* Sticky Header with End-to-End Border */}
            <div className="h-14 px-4 border-b border-[#E8E8E6] bg-white flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-900" />
                <h3 className="text-xs font-bold text-zinc-900 tracking-tight">
                  {t('contactDetails')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactSidebar(false)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                title={t('hideContactDetails') || 'Hide Contact Info'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeConv && activeConv.contact ? (
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col divide-y divide-[#E8E8E6] bg-white">
                
                {/* 1. Profile Identity Section */}
                <div className="p-5 flex flex-col items-center text-center bg-white">
                  <div className="relative mb-3">
                    <div className="h-16 w-16 rounded-full bg-zinc-100 border border-[#E8E8E6] flex items-center justify-center font-bold text-zinc-800 text-xl shadow-xs select-none">
                      {activeConv.contact.first_name?.[0] || activeConv.contact.last_name?.[0] || 'C'}
                    </div>
                    {activeConv.channel_connection && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white border border-[#E8E8E6] flex items-center justify-center shadow-xs">
                        {getChannelLogo(activeConv.channel_connection.channel_type, "h-3.5 w-3.5")}
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-zinc-950 flex items-center justify-center gap-1.5">
                    {`${activeConv.contact.first_name || 'New'} ${activeConv.contact.last_name || 'Contact'}`.trim()}
                  </h4>

                  <p className="text-xs text-zinc-500 font-mono mt-0.5 max-w-[240px] truncate" title={activeConv.contact.phone || activeConv.contact.email || activeConv.external_chat_id}>
                    {activeConv.contact.phone || activeConv.contact.email || activeConv.external_chat_id}
                  </p>

                  {/* Stage & Status Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      activeConv.contact.lifecycle_stage === 'customer'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : activeConv.contact.lifecycle_stage === 'opportunity'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : activeConv.contact.lifecycle_stage === 'subscriber'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : activeConv.contact.lifecycle_stage === 'churned'
                        ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {tContacts(activeConv.contact.lifecycle_stage || 'lead') || activeConv.contact.lifecycle_stage || 'Lead'}
                    </span>

                    {activeConv.contact.is_muted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-200" title={t('titles.muted')}>
                        <VolumeX className="h-2.5 w-2.5" />
                        <span>{t('titles.muted')}</span>
                      </span>
                    )}
                  </div>

                  {/* Quick Profile Actions */}
                  <div className="flex items-center justify-center gap-2 mt-3.5 w-full">
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      disabled={isMuting}
                      className="flex-1 h-8 px-3 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {activeConv.contact.is_muted ? (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{t('unmuteContact') || 'Unmute'}</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{t('muteContact') || 'Mute'}</span>
                        </>
                      )}
                    </button>

                    {(activeConv.contact.phone || activeConv.contact.email) && (
                      <button
                        type="button"
                        onClick={() => {
                          const val = activeConv.contact?.phone || activeConv.contact?.email || '';
                          navigator.clipboard.writeText(val);
                          toast.success(t('trackingNumberCopied'));
                        }}
                        className="h-8 px-3 rounded-[6px] border border-[#E8E8E6] bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        title={t('copy') || 'Copy'}
                      >
                        <Copy className="h-3.5 w-3.5 text-zinc-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. AI Copilot & Routing Section */}
                <div className="p-4 space-y-3 bg-white">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{t('aiAssistantControl') || 'AI & Routing'}</span>
                  </h5>

                  {/* AI Copilot Toggle Card */}
                  <div className="p-3 rounded-[6px] border border-[#E8E8E6] bg-zinc-50/50 hover:bg-zinc-50 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-md bg-white border border-[#E8E8E6] flex items-center justify-center text-zinc-800 shadow-xs">
                        <Bot className="h-4 w-4 text-zinc-700" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-900 block leading-tight">{t('aiCopilotChat')}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{t('autoReplyContact')}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activeConv.ai_active}
                      onClick={() => handleAiToggle(!activeConv.ai_active)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        activeConv.ai_active ? 'bg-black' : 'bg-zinc-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          activeConv.ai_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Assigned Team Router with CustomSelect */}
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                      {t('assignedTeamRouter')}
                    </label>
                    <CustomSelect
                      value={activeConv.assigned_team_id || ''}
                      onChange={val => handleTeamChange(val ? Number(val) : null)}
                      options={[
                        { value: '', label: t('noTeamAssigned') || 'No Team Assigned' },
                        ...teams.map(teamItem => ({ value: teamItem.id, label: teamItem.name }))
                      ]}
                      placeholder={t('noTeamAssigned') || 'Select team...'}
                    />
                  </div>
                </div>

                {/* 3. CRM Properties Form */}
                <div className="p-4 space-y-3 bg-white">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{t('crmInformation')}</span>
                  </h5>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        {tContacts('firstName')}
                      </label>
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={e => setEditFirstName(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                        placeholder={tContacts('firstName')}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                        {tContacts('lastName')}
                      </label>
                      <input
                        type="text"
                        value={editLastName}
                        onChange={e => setEditLastName(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                        placeholder={tContacts('lastName')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      {tContacts('email')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      {tContacts('phone')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                      {tContacts('lifecycle')}
                    </label>
                    <CustomSelect
                      value={editStage}
                      onChange={val => setEditStage(String(val))}
                      options={[
                        { value: 'lead', label: tContacts('lead') || 'Lead' },
                        { value: 'subscriber', label: tContacts('subscriber') || 'Subscriber' },
                        { value: 'opportunity', label: tContacts('opportunity') || 'Opportunity' },
                        { value: 'customer', label: tContacts('customer') || 'Customer' },
                        { value: 'churned', label: tContacts('churned') || 'Churned' },
                      ]}
                      placeholder={tContacts('lifecycle') || 'Select stage...'}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateContact}
                    className="w-full h-9 bg-zinc-900 hover:bg-black text-white text-xs font-semibold rounded-[6px] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{t('saveProperties')}</span>
                  </button>
                </div>

                {/* 4. Contact Tags Section */}
                <div className="p-4 space-y-2.5 bg-white">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-zinc-400" />
                    <span>{t('contactTags')}</span>
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {activeConv.contact.tags && activeConv.contact.tags.length > 0 ? (
                      activeConv.contact.tags.map(tag => (
                        <span 
                          key={tag} 
                          className="text-[10px] font-semibold px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full flex items-center gap-1.5 border border-zinc-200 hover:bg-zinc-200 transition-colors"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400 italic">{t('noTags')}</span>
                    )}
                  </div>
                  <div className="relative mt-2">
                    <Plus className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={t('tagPlaceholder')}
                      value={newTagText}
                      onChange={e => setNewTagText(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="w-full h-9 pl-9 pr-3 bg-white border border-[#E8E8E6] hover:border-zinc-300 rounded-[6px] text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* 5. E-Commerce Customer Context - Guarded */}
                {hasEcommerceIntegration && (
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{t('ecommerceContext')}</span>
                      </h5>
                    </div>

                    {/* E-Commerce Quick Actions */}
                    <div className={`grid ${isWhatsAppActive ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 pt-0.5`}>
                      <button
                        type="button"
                        onClick={() => {
                          setEcommerceModalTab('products');
                          setShowEcommerceModal(true);
                        }}
                        className="h-8 px-2 bg-white hover:bg-zinc-50 border border-[#E8E8E6] hover:border-zinc-300 text-zinc-800 rounded-[6px] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                        title={t('browseProductsTooltip')}
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span className="truncate">{t('sendProduct')}</span>
                      </button>

                      {isWhatsAppActive && (
                        <button
                          type="button"
                          onClick={() => {
                            setEcommerceModalTab('whatsapp_catalog');
                            setShowEcommerceModal(true);
                          }}
                          className="h-8 px-2 bg-white hover:bg-zinc-50 border border-[#E8E8E6] hover:border-zinc-300 text-zinc-800 rounded-[6px] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                          title={t('dispatchWaCatalogTooltip')}
                        >
                          <Layers3 className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                          <span className="truncate">{t('whatsappCatalog')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEcommerceModalTab('discounts');
                          setShowEcommerceModal(true);
                        }}
                        className="h-8 px-2 bg-white hover:bg-zinc-50 border border-[#E8E8E6] hover:border-zinc-300 text-zinc-800 rounded-[6px] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                        title={t('createDiscountTooltip')}
                      >
                        <Tag className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span className="truncate">{t('createDiscount')}</span>
                      </button>
                    </div>

                    {ecoLoading ? (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-450">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('loadingCustomerDetails')}</span>
                      </div>
                    ) : !ecoContext || (!ecoContext.active_cart && (!ecoContext.orders || ecoContext.orders.length === 0)) ? (
                      <div className="text-[11px] text-zinc-400 italic">
                        {t('noCartOrOrdersFound')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Active Cart */}
                        {ecoContext.active_cart && (
                          <div className="p-3 border border-[#E8E8E6] rounded-lg bg-[#FAFAFA] space-y-2 shadow-3xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                {t('activeCart')}
                              </span>
                              <span className="text-xs font-extrabold text-black">
                                {ecoContext.active_cart.currency || '$'}{Number(ecoContext.active_cart.total_price || 0).toFixed(2)}
                              </span>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              {ecoContext.active_cart.cart_items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                  <span className="text-zinc-700 font-medium truncate max-w-[140px]" title={item.product_name}>
                                    {item.quantity}x {item.product_name}
                                  </span>
                                  <span className="text-zinc-500 font-mono">
                                    {ecoContext.active_cart.currency || '$'}{Number(item.price || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {ecoContext.active_cart.recovery_checkout_url && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMessageText(prev => (prev ? `${prev}\n\n` : '') + `${t('checkoutRecoveryText') || 'Here is your checkout link:'} ${ecoContext.active_cart.recovery_checkout_url}`);
                                  toast.success(t('recoveryLinkCopied'));
                                }}
                                className="w-full mt-2 h-8 bg-zinc-950 hover:bg-black text-white text-[10px] font-bold rounded-[6px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                <span>{t('insertRecoveryLink')}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Orders History */}
                        {ecoContext.orders && ecoContext.orders.length > 0 && (
                          <div className="space-y-2">
                            <h6 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('orderHistory')}</h6>
                            {ecoContext.orders.map((order: any) => (
                              <div key={order.id} className="p-3 border border-[#E8E8E6] rounded-[6px] bg-zinc-50/50 space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-black">{t('orderPrefix')} {order.order_number}</span>
                                  <span className="font-extrabold text-zinc-900">{order.currency || '$'}{Number(order.total_price || 0).toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-zinc-400">{order.items_count || order.order_items?.length || 1} {t('items')}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-white text-[8px] font-bold uppercase tracking-wider text-zinc-650 border border-zinc-200">
                                    {order.fulfillment_status}
                                  </span>
                                </div>
                                {order.tracking_number && (
                                  <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px]">
                                    <span className="text-zinc-400 font-medium">{t('tracking')} <span className="font-mono text-zinc-700 font-semibold">{order.tracking_number}</span></span>
                                    <div className="flex gap-1.5 text-[9px]">
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(order.tracking_number);
                                          toast.success(t('trackingNumberCopied'));
                                        }}
                                        className="text-zinc-600 hover:text-black font-bold uppercase tracking-wide cursor-pointer"
                                      >
                                        {t('copy')}
                                      </button>
                                      {order.tracking_url && (
                                        <a
                                          href={order.tracking_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-emerald-600 hover:text-emerald-700 font-bold uppercase tracking-wide"
                                        >
                                          {t('track')}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Conversation Meta & Actions */}
                <div className="p-4 space-y-3 bg-zinc-50/40">
                  <div className="space-y-1.5 text-[11px] text-zinc-500">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">{t('channel')}</span>
                      <span className="font-semibold text-zinc-800 flex items-center gap-1">
                        {activeConv.channel_connection?.name || 'Default Channel'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">{t('chatId')}</span>
                      <span className="font-mono text-zinc-600 text-[10px] truncate max-w-[140px]" title={activeConv.external_chat_id}>
                        {activeConv.external_chat_id}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full h-9 px-3 rounded-[6px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs mt-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('deleteChat')}</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 bg-white">
                <User className="h-10 w-10 text-zinc-300 stroke-1 mb-2" />
                <p className="text-xs text-zinc-500 font-medium">{t('noContactSelected') || 'No contact selected'}</p>
              </div>
            )}
          </div>
        </React.Fragment>
      )}

      </div>

      {/* Lightbox / Media Viewer Modal */}
      {activeMediaPreviewUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setActiveMediaPreviewUrl(null)} />
          
          <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden z-10 border border-[#E8E8E6] flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-[#E8E8E6] bg-zinc-50 shrink-0 select-none">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('mediaPreview')}</span>
              <div className="flex items-center gap-3">
                <a
                  href={activeMediaPreviewUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-955 hover:bg-zinc-900 text-white px-3 py-1 rounded-[6px] text-[10px] font-semibold transition-all shadow-3xs flex items-center gap-1 cursor-pointer"
                >
                  {t('downloadOriginal')}
                </a>
                <button
                  type="button"
                  onClick={() => setActiveMediaPreviewUrl(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/5 min-h-[300px]">
              {(() => {
                const ext = activeMediaPreviewUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
                if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
                  return (
                    <img
                      src={activeMediaPreviewUrl}
                      alt="Preview"
                      className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
                    />
                  );
                }
                if (['mp4', 'webm', 'ogg'].includes(ext)) {
                  return (
                    <video
                      src={activeMediaPreviewUrl}
                      controls
                      autoPlay
                      className="max-w-full max-h-[70vh] rounded shadow-lg"
                    />
                  );
                }
                if (ext === 'pdf') {
                  return (
                    <iframe
                      src={activeMediaPreviewUrl}
                      className="w-full h-[70vh] rounded border-0"
                      title={t('pdfPreview')}
                    />
                  );
                }
                return (
                  <div className="text-center p-8">
                    <FileText className="h-16 w-16 text-zinc-300 mx-auto mb-3" />
                    <p className="text-xs text-zinc-500 font-semibold mb-3">{t('previewNotSupported')}</p>
                    <a
                      href={activeMediaPreviewUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black hover:bg-zinc-800 text-white px-4 py-2 rounded-md text-xs font-bold transition-all inline-block cursor-pointer shadow-sm"
                    >
                      {t('downloadToView')}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* START CONVERSATION MODAL */}
      {startChatOpen && mounted && (
        <InboxStartChatModal
          isOpen={startChatOpen}
          onClose={() => setStartChatOpen(false)}
          allContacts={allContacts}
          allChannels={allChannels}
          onChatStarted={async (newConvId) => {
            await fetchConversations();
            setActiveConvId(newConvId);
          }}
        />
      )}

      {/* DELETE CONVERSATION CONFIRMATION MODAL */}
      {deleteConfirmOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-[#0A0A0A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all duration-300 animate-overlay-fade select-none"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div 
            className="bg-white border border-[#E8E8E6] rounded-xl max-w-sm w-full p-6 shadow-xl relative z-50 animate-modal-box text-left font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section (Connected End-to-End Divider) */}
            <div className="flex items-center justify-between border-b border-[#E8E8E6] p-5 -mx-6 -mt-6">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-[#FAFAFA] border border-[#E8E8E6] p-1 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-black uppercase tracking-wider">{t('confirmDeleteTitle')}</h3>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDeleteConfirmOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 border border-transparent hover:border-zinc-200/80 transition-all cursor-pointer shadow-none hover:shadow-3xs focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 pt-4">
              <p className="text-xs text-[#6B6B6B] leading-relaxed font-semibold">
                {t('deleteWarning')}
              </p>
            </div>

            {/* Action Buttons Footer Strip */}
            <div className="bg-[#FAFAFA] border-t border-[#E8E8E6] p-5 -mx-6 -mb-6 mt-4 rounded-b-[12px] flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="border border-[#E8E8E6] bg-white text-[#6B6B6B] hover:text-black h-9 px-4 text-xs font-bold rounded-[6px] transition-all cursor-pointer shadow-3xs"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConversation}
                className="h-9 px-4 bg-red-600 hover:bg-red-750 text-white font-bold text-xs rounded-[6px] shadow-sm transition-all flex items-center justify-center min-w-[100px] cursor-pointer"
              >
                {isDeleting ? t('deleting') : t('yesDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* WhatsApp Flow Form Dispatch Modal */}
      {showWhatsAppFlowModal && mounted && (
        <InboxWhatsAppFlowModal
          isOpen={showWhatsAppFlowModal}
          onClose={() => setShowWhatsAppFlowModal(false)}
          activeConvId={activeConvId}
          whatsAppFlowsList={whatsAppFlowsList}
          onFlowSent={(chatMessage) => {
            if (chatMessage) {
              setMessages(prev => [...prev, chatMessage]);
              setTimeout(() => scrollToBottom('smooth'), 100);
            } else if (activeConvId) {
              fetchWithCsrf(`/conversations/${activeConvId}/messages`).then(async (res) => {
                if (res.ok) {
                  const freshMsgs = await res.json();
                  setMessages(freshMsgs);
                  setTimeout(() => scrollToBottom('smooth'), 100);
                }
              });
            }
          }}
        />
      )}

      {/* E-COMMERCE CATALOG & DISCOUNT GENERATION MODAL */}
      {showEcommerceModal && mounted && (
        <InboxEcommerceModal
          isOpen={showEcommerceModal}
          onClose={() => setShowEcommerceModal(false)}
          activeConvId={activeConvId}
          activeConv={activeConv}
          isWhatsAppActive={isWhatsAppActive}
          initialTab={ecommerceModalTab}
          onSendDirectOutbound={(text, mediaUrl) => sendDirectOutbound(text, mediaUrl)}
          onInsertIntoComposer={(text) => {
            setMessageText(prev => (prev ? `${prev}\n\n${text}` : text));
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }}
          onRefreshMessages={async () => {
            if (activeConvId) {
              const msgRes = await fetchWithCsrf(`/conversations/${activeConvId}/messages`);
              if (msgRes.ok) {
                const msgData = await msgRes.json();
                setMessages(msgData.messages || msgData || []);
              }
            }
          }}
        />
      )}
    </div>
  );
}
