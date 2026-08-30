#!/bin/bash
set -euo pipefail

# Trigger a deploy of the existing Call Break Render service.
#
# Option A (recommended): deploy hook from Render dashboard → Settings → Deploy Hook
#   RENDER_DEPLOY_HOOK_URL='https://api.render.com/deploy/srv-...?key=...' ./scripts/trigger-render-deploy.sh
#
# Option B: Render API key
#   RENDER_API_KEY='rnd_...' ./scripts/trigger-render-deploy.sh

SERVICE_ID="${RENDER_SERVICE_ID:-srv-da9lmeajnfac73e7uhfg}"
CLEAR_CACHE="${RENDER_CLEAR_CACHE:-clear}"

if [[ -n "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
  echo "Triggering deploy via deploy hook…"
  curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
  echo
  echo "Deploy queued."
  exit 0
fi

if [[ -n "${RENDER_API_KEY:-}" ]]; then
  echo "Triggering deploy for $SERVICE_ID via Render API…"
  curl -fsS -X POST "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"clearCache\":\"${CLEAR_CACHE}\"}" | python3 -c "
import json, sys
data = json.load(sys.stdin)
deploy = data.get('deploy', data)
print('Deploy id:', deploy.get('id', 'unknown'))
print('Status:', deploy.get('status', 'queued'))
"
  echo "Deploy queued."
  exit 0
fi

echo "Set RENDER_DEPLOY_HOOK_URL or RENDER_API_KEY to trigger a deploy." >&2
exit 1
