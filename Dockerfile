FROM node:22-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-wqy-zenhei \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV DOWNLOAD_DIR=/app/downloads
ENV DATA_DIR=/app/database
ENV PROVIDER_DIR=/app/provider
ENV SERVE_STATIC=true
ENV WEB_HOST=0.0.0.0
ENV WEB_PORT=5000
ENV MAX_RUNNING_TASKS=2

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

RUN mkdir -p /app/downloads /app/database /app/provider && chown -R 1000:1000 /app

EXPOSE 5000

USER 1000

CMD ["npm", "run", "start:server"]
