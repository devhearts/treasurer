# syntax=docker/dockerfile:1
# Next.js web (standalone) — monorepo context: repository root.
FROM node:22-alpine AS builder

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/

RUN npm ci

COPY apps/web apps/web

ARG NEXT_PUBLIC_FEATURE_SUBSCRIPTION_PAYMENT=0
ENV NEXT_PUBLIC_FEATURE_SUBSCRIPTION_PAYMENT=${NEXT_PUBLIC_FEATURE_SUBSCRIPTION_PAYMENT}

# Stable Server Actions across rebuilds / replicas (AES-256 key, base64). Override in production.
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

RUN npm run build -w @treasurer/web

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY}

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
# Container listens on 3000; compose maps "${HOST_PORT_WEB:-3000}:3000" (see docker/ports.base.json).
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
