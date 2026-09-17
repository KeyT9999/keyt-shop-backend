#!/bin/bash
set -e

echo "========================================================"
echo "ðŸš€ Khá»Ÿi Ä‘á»™ng KeyT Unified Service (Node.js + Python AI)  "
echo "========================================================"

export PYTHONPATH="/app/speech-ai-service:$PYTHONPATH"
export SPEECH_AI_URL="${SPEECH_AI_URL:-http://127.0.0.1:8001}"

echo "ðŸŽ™ï¸ [1/2] Khá»Ÿi Ä‘á»™ng Python Speech AI Microservice táº¡i 127.0.0.1:8001..."
(cd /app/speech-ai-service && python -m uvicorn main:app --host 127.0.0.1 --port 8001) &
PYTHON_PID=$!

echo "ðŸŒ [2/2] Khá»Ÿi Ä‘á»™ng Node.js Express Backend táº¡i port ${PORT:-10000}..."
node src/server.js &
NODE_PID=$!

shutdown() {
  echo "âš ï¸ Äang dá»«ng cÃ¡c tiáº¿n trÃ¬nh KeyT..."
  kill -TERM "$PYTHON_PID" "$NODE_PID" 2>/dev/null || true
  wait "$PYTHON_PID" 2>/dev/null || true
  wait "$NODE_PID" 2>/dev/null || true
  exit 0
}

trap shutdown SIGTERM SIGINT EXIT

# Äá»£i tiáº¿n trÃ¬nh chÃ­nh (Node.js Express)
wait "$NODE_PID"
