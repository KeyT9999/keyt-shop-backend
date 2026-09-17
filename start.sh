#!/bin/bash
set -e

echo "========================================================"
echo "🚀 Khởi động KeyT Unified Service (Node.js + Python AI)  "
echo "========================================================"

export PYTHONPATH="/app/speech-ai-service:$PYTHONPATH"
export SPEECH_AI_URL="${SPEECH_AI_URL:-http://127.0.0.1:8001}"

echo "🎙️ [1/2] Khởi động Python Speech AI Microservice tại 127.0.0.1:8001..."
(cd /app/speech-ai-service && python -m uvicorn main:app --host 127.0.0.1 --port 8001) &
PYTHON_PID=$!

echo "🌐 [2/2] Khởi động Node.js Express Backend tại port ${PORT:-10000}..."
node src/server.js &
NODE_PID=$!

shutdown() {
  echo "⚠️ Đang dừng các tiến trình KeyT..."
  kill -TERM "$PYTHON_PID" "$NODE_PID" 2>/dev/null || true
  wait "$PYTHON_PID" 2>/dev/null || true
  wait "$NODE_PID" 2>/dev/null || true
  exit 0
}

trap shutdown SIGTERM SIGINT EXIT

# Đợi tiến trình chính (Node.js Express)
wait "$NODE_PID"