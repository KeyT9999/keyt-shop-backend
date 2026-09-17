FROM python:3.11-slim

# Install system dependencies (FFmpeg for audio transcoding, build-essential for C extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-cache faster-whisper model (tiny & base) so container starts instantly without download delay
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny', device='cpu', compute_type='int8')"

# Copy application source code
COPY . .

# Set environment defaults
ENV PORT=8001
ENV HOST=0.0.0.0
ENV WHISPER_MODEL_SIZE=tiny
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

# Start FastAPI service with Uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
