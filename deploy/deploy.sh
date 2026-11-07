#!/usr/bin/env bash
# Manual prod deploy, run on the server itself (no CI / registry needed):
# builds both images locally, syncs the stack files to /opt/apps/pocket-ledger, starts it.
# Needs: write access to that folder, docker group, and a filled-in .env there (see .env.example).
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
app=/opt/apps/pocket-ledger
site=https://ledger.efficanova.com

if [ ! -f "$app/.env" ]; then
  echo "Missing $app/.env — copy deploy/.env.example there and fill it in." >&2
  exit 1
fi

# Tagged with the ghcr names compose.yaml uses, so compose runs these instead of pulling.
docker build -t ghcr.io/tusharlokhande/pocketledger-api:latest "$repo/src/server"
docker build -t ghcr.io/tusharlokhande/pocketledger-client:latest \
  --build-arg VITE_API_BASE_URL="$site" "$repo/src/client"

install -m 644 "$repo/deploy/compose.yaml" "$app/compose.yaml"
install -m 755 "$repo/deploy/backup.sh" "$app/backup.sh"

cd "$app"
docker compose up -d --remove-orphans
docker image prune -f

for i in $(seq 12); do
  web=$(curl -s -o /dev/null -w '%{http_code}' "$site/" || true)
  api=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$site/api/auth/refresh" || true)
  echo "try $i: web=$web api=$api"
  if [ "$web" = 200 ] && [ "$api" = 401 ]; then echo "Deployed."; exit 0; fi
  sleep 5
done
echo "Site or API not healthy — check: docker compose -f $app/compose.yaml logs api" >&2
exit 1
