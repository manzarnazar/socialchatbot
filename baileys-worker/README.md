# WhatsOmni Baileys WhatsApp Microservice Worker

This microservice provides non-official WhatsApp Web Multi-Device socket sessions using `@whiskeysockets/baileys`.

## Features
- QR Code generation and state synchronization with Laravel backend via authenticated webhooks.
- Multi-session management per tenant connection.
- Auto-recovery of active sessions on startup.
- Authenticated HTTP control API using `X-Baileys-Secret`.

## Environment Variables
- `PORT`: Service port (default: `5006`).
- `LARAVEL_API_URL`: Backend Laravel API URL (default: `http://localhost:8000`).
- `BAILEYS_SECRET_TOKEN`: Shared secret key matching Laravel backend `BAILEYS_SECRET_TOKEN`.

## Setup & Run
```bash
npm install
npm start
```
