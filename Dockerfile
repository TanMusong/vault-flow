# =========================
# Build
# =========================
FROM node:22-slim AS build

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json

RUN npm ci

# Copy source
COPY . .

# Build server and web
RUN npm run build


# =========================
# Runtime
# =========================
FROM node:22-slim

# Chromium is required at runtime by Vault Flow
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-wqy-zenhei \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium \
    DOWNLOAD_DIR=/app/downloads \
    DATA_DIR=/app/data \
    PROVIDER_DIR=/app/providers \
    SERVE_STATIC=true \
    WEB_HOST=0.0.0.0 \
    WEB_PORT=5000 \
    MAX_RUNNING_TASKS=2

WORKDIR /app

# Copy production dependency manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json

# Install runtime dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/providers ./server/providers
COPY --from=build /app/web/dist ./web/dist

# Runtime data directories
RUN mkdir -p \
    /app/downloads \
    /app/data \
    /app/providers \
    && chown -R 1000:1000 \
        /app/downloads \
        /app/data \
        /app/providers

EXPOSE 5000

USER 1000

CMD ["npm", "run", "start:server"]