FROM python:3.11-slim

# Install system dependencies (FFmpeg for audio conversion, curl, build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Python dependencies first for Docker layer caching
COPY speech-ai-service/requirements.txt ./speech-ai-service/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r speech-ai-service/requirements.txt

# 2. Pre-cache faster-whisper tiny model (boot container instantly without download lag)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# 3. Install Node.js production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 4. Copy full application source code
COPY . .

# Ensure start.sh has executable permissions, Unix line endings, and no UTF-8 BOM
RUN chmod +x start.sh && sed -i -e '1s/^\xef\xbb\xbf//' -e 's/\r$//' start.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=10000
ENV SPEECH_AI_URL=http://127.0.0.1:8001
ENV WHISPER_MODEL_SIZE=tiny
ENV PYTHONUNBUFFERED=1

EXPOSE 10000

CMD ["bash", "start.sh"]
