# CityPass Worker - Production Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/llm/package.json ./packages/llm/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/search/package.json ./packages/search/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# Copy source code
COPY packages ./packages
COPY apps/worker ./apps/worker

# Generate Prisma client
RUN pnpm --filter @citypass/db generate

# Build packages
RUN pnpm --filter @citypass/db build || true
RUN pnpm --filter @citypass/llm build || true
RUN pnpm --filter @citypass/analytics build || true
RUN pnpm --filter @citypass/search build || true
RUN pnpm --filter @citypass/types build || true
RUN pnpm --filter @citypass/utils build || true

# Prune dev dependencies
RUN pnpm prune --prod

# Expose health check port
EXPOSE 3003

# Set environment
ENV NODE_ENV=production
ENV PORT=3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start worker
CMD ["pnpm", "--filter", "@citypass/worker", "start"]
