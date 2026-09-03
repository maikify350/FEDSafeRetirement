FROM node:20-slim

# Install FFmpeg and Chromium (required by Remotion for rendering)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ffmpeg \
      chromium \
      fonts-liberation \
      libnss3 \
      libatk-bridge2.0-0 \
      libdrm2 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      libgbm1 \
      libasound2 \
      libpangocairo-1.0-0 \
      libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Tell Remotion/Puppeteer where Chromium is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

# 1. Install server dependencies (including devDeps for tsc)
COPY render-service/package*.json ./
RUN npm ci

# 2. Copy server source and compile TypeScript
COPY render-service/server.ts ./
COPY render-service/tsconfig.json ./
RUN npx tsc

# 3. Remove devDependencies after compiling
RUN npm prune --production

# 4. Copy the Remotion project (compositions + public assets)
COPY remotion/ ./remotion/

# 5. Install Remotion project dependencies
WORKDIR /app/remotion
RUN npm ci --production
WORKDIR /app

# Create output directory
RUN mkdir -p /app/remotion/out

EXPOSE 3100

CMD ["node", "dist/server.js"]
