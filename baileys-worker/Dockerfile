# Node.js 20 Alpine Dockerfile for WhatsApp Baileys Worker
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --prefer-offline --no-audit

# Copy application source
COPY server.js ./

# Create persistent session directory
RUN mkdir -p storage/sessions

ENV PORT=5006
ENV NODE_ENV=production

EXPOSE 5006

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5006/health || exit 1

CMD ["node", "--max-old-space-size=256", "server.js"]
