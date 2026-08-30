#!/bin/bash
set -euo pipefail

# Deploy Call Break to Render (requires RENDER_API_KEY and gh auth).
# Usage: RENDER_API_KEY=rnd_xxx ./scripts/deploy-render.sh

cd "$(dirname "$0")/.."

: "${RENDER_API_KEY:?Set RENDER_API_KEY}"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub not authenticated. Run: gh auth login -h github.com -p https"
  exit 1
fi

OWNER_ID="tea-da9lj4ijnfac73e7msm0"
REPO_NAME="call-break"
BRANCH="main"

if ! gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
else
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$(gh api user -q .login)/$REPO_NAME.git"
  git push -u origin "$BRANCH" --force
fi

REPO_URL="https://github.com/$(gh api user -q .login)/$REPO_NAME"

curl -s -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"ownerId\": \"$OWNER_ID\",
    \"type\": \"web_service\",
    \"name\": \"call-break\",
    \"repo\": \"$REPO_URL\",
    \"branch\": \"$BRANCH\",
    \"autoDeploy\": \"yes\",
    \"serviceDetails\": {
      \"runtime\": \"node\",
      \"plan\": \"free\",
      \"healthCheckPath\": \"/health\",
      \"envSpecificDetails\": {
        \"buildCommand\": \"npm install --include=dev && npm run build\",
        \"startCommand\": \"npm start\"
      }
    },
    \"envVars\": [{\"key\": \"NODE_ENV\", \"value\": \"production\"}]
  }" \
  "https://api.render.com/v1/services" | python3 -c "
import json, sys
data = json.load(sys.stdin)
svc = data.get('service', data)
print('URL:', svc.get('serviceDetails', {}).get('url', 'pending'))
print('Dashboard:', svc.get('dashboardUrl', ''))
"
