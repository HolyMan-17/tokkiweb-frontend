# ── Stage 1: Build the Vite SPA ──────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

# Dependency layer (cached unless lock/workspace change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Source
COPY . .

# Build-time vars — Vite bakes VITE_* into the client JS bundle.
# Set these as "Build Variables" in Coolify's Environment Variables UI.
ARG VITE_PUBLIC_SITE_URL=https://www.tokkishopve.com
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_URL=/api

ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ── Stage 2: Production image ────────────────────
FROM node:24-alpine
WORKDIR /app

# Only the built SPA + the production server
COPY --from=builder /app/dist ./dist
COPY server/og-server.mjs ./server/og-server.mjs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "server/og-server.mjs"]
