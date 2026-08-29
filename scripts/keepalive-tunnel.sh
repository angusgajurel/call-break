#!/bin/bash
set -euo pipefail

CLOUDFLARED="${CLOUDFLARED:-/tmp/cloudflared}"
PORT="${PORT:-3001}"
LOG="/tmp/cf-tunnel.log"

if [[ ! -x "$CLOUDFLARED" ]]; then
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED"
  chmod +x "$CLOUDFLARED"
fi

while true; do
  echo "[$(date -Is)] Starting Cloudflare tunnel -> localhost:$PORT" | tee -a "$LOG"
  "$CLOUDFLARED" tunnel --url "http://127.0.0.1:$PORT" 2>&1 | tee -a "$LOG" || true
  echo "[$(date -Is)] Tunnel exited, restarting in 5s..." | tee -a "$LOG"
  sleep 5
done
