#!/usr/bin/env bash
# Nightly Postgres backup for /opt/apps/pocket-ledger. Keeps 14 days.
set -euo pipefail
umask 077 # dumps hold the whole financial DB: owner-only
cd "$(dirname "$0")"
mkdir -p backups
out="backups/ledger-$(date +%Y%m%d).dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$out.tmp"
mv "$out.tmp" "$out"
find backups -name 'ledger-*.dump' -mtime +14 -delete
