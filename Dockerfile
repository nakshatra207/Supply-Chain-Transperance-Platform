# syntax=docker/dockerfile:1
# ==============================================================================
# Multi-Stage Cross-Platform Dockerfile (AMD64 / x86_64 & ARM64 / Apple Silicon)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Native C11 / C++20 / Assembly & Workspace Builder
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    make \
    python3 \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package.json ./
COPY contracts/package.json ./contracts/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies across all workspaces
RUN cd contracts && npm install --no-audit --no-fund \
    && cd ../backend && npm install --no-audit --no-fund \
    && cd ../frontend && npm install --no-audit --no-fund

# Copy full source code
COPY Makefile ./
COPY native ./native
COPY contracts ./contracts
COPY backend ./backend
COPY frontend ./frontend

# Compile Native C11 / C++20 / x86_64 SIMD (or ARM64 fallback) N-API Addon & Fast Launcher
RUN make clean && make all

# Compile Solidity Smart Contracts & Generate Prisma Client
RUN cd contracts && npx hardhat compile \
    && cd ../backend && npx prisma generate \
    && cd ../frontend && npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Hardened Runtime (Non-Root User, Minimal Footprint)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled artifacts and production workspaces from builder stage
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/native ./native
COPY --from=builder --chown=node:node /app/contracts ./contracts
COPY --from=builder --chown=node:node /app/backend ./backend
COPY --from=builder --chown=node:node /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=node:node /app/frontend/package.json ./frontend/package.json
COPY --from=builder --chown=node:node /app/frontend/node_modules ./frontend/node_modules

# Ensure writable data directory for local cryptographic ledger owned by non-root user
RUN mkdir -p /app/backend/src/data /app/.run && chown -R node:node /app/backend/src/data /app/.run

# Drop root privileges
USER node

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000 5173 8545

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD ./native/fast_launcher wait-http 127.0.0.1 5000 /api/health '"status":"ok"' 3000 || exit 1

STOPSIGNAL SIGTERM

CMD ["node", "backend/src/index.js"]
