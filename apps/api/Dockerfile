# syntax=docker/dockerfile:1
# Nest API — monorepo context: repository root.
FROM node:22-alpine AS builder

WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci

COPY apps/api apps/api

RUN npm run build -w @treasurer/api

# One-shot migrations: baseline legacy push-only DBs, then `drizzle-kit migrate`.
FROM builder AS migrator
WORKDIR /repo
CMD ["node", "apps/api/scripts/docker-db-migrate.cjs"]

# One-shot OG image backfill: compress slot-0 gallery images to events/{id}/og.webp.
FROM builder AS backfill
WORKDIR /repo/apps/api
CMD ["npx", "tsx", "src/database/backfill-event-og-images.ts"]

FROM node:22-alpine AS runner

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
RUN apk add --no-cache dumb-init

WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /repo/apps/api/dist ./apps/api/dist

WORKDIR /repo/apps/api
USER nodejs

# Container listens on 4000; compose maps "${HOST_PORT_API:-4000}:4000" (see docker/ports.base.json).
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
