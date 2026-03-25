# ============================================================================
# Multi-Stage Production Dockerfile for UI SyncUp
# ============================================================================
# Optimized for self-hosting. Published to ghcr.io/bykhd/ui-syncup on release.
#
# Build:  docker build -t ui-syncup .
# Run:    docker run -p 3000:3000 --env-file .env.production ui-syncup
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build the application
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
# Use ARG for build-time-only dummy values so they are not baked into image layers
ARG DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy
ARG BETTER_AUTH_SECRET=dummy-secret-32-characters-long!!
ARG BETTER_AUTH_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG STORAGE_ENDPOINT=http://localhost:9000
ARG STORAGE_ATTACHMENTS_PUBLIC_URL=http://localhost:9000
ARG STORAGE_MEDIA_PUBLIC_URL=http://localhost:9000
ARG RESEND_API_KEY=re_dummy

RUN bun run build

# ---------------------------------------------------------------------------
# Stage 3: Production runtime (oven/bun for migration support)
# ---------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration assets needed by the compose entrypoint: bun run db:migrate
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock* ./
COPY --from=builder /app/scripts/migrate.ts ./scripts/migrate.ts
COPY --from=builder /app/drizzle ./drizzle

# Install production deps (drizzle-orm, postgres, dotenv needed by migration)
RUN bun install --production --frozen-lockfile

RUN chown -R nextjs:nodejs /app/drizzle /app/scripts /app/package.json

USER nextjs

EXPOSE 3000

# Default CMD for standalone runs without compose.
# The compose entrypoint overrides this with: sh -c "bun run db:migrate && node server.js"
CMD ["node", "server.js"]
