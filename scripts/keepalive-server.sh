#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${PORT:-3001}"

while true; do
  echo "[$(date -Is)] Starting Call Break server on :$PORT"
  node server/index.js || true
  echo "[$(date -Is)] Server exited, restarting in 3s..."
  sleep 3
done
