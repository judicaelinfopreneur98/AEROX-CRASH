# ==========================================
# MULTI-STAGE DOCKERFILE POUR AEROX CRASH
# ==========================================

# Étape 1 : Dépendances
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# Étape 2 : Construction de l'application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build:next

# Étape 3 : Image d'exécution légère de production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Création d'un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 aerox

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/game-engine ./game-engine
COPY --from=builder /app/wallet ./wallet
COPY --from=builder /app/auth ./auth
COPY --from=builder /app/websocket ./websocket
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/admin ./admin

USER aerox

EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
