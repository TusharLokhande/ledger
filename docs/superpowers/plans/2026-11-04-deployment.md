# Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PocketLedger runs at `https://ledger.efficanova.com` from `/opt/apps/pocket-ledger`, redeployed automatically on every push to `main`, with telemetry in the existing observability stack and finora retired.

**Architecture:** GitHub Actions builds two images (nginx client, .NET API), pushes them to GHCR, then SSHes into this PC as `deploy` and runs `docker compose pull && up -d`. The running Traefik routes `Host(ledger.efficanova.com)` to the client and `… && PathPrefix(/api)` to the API. Postgres and Azurite run in the same compose project and are never exposed.

**Tech Stack:** Docker Compose, Traefik v3.6 (already running), GitHub Actions, GHCR, nginx, Node 24, .NET 10, Postgres 17, Azurite, OpenTelemetry.

**Spec:** `docs/superpowers/specs/2026-11-04-deployment-design.md`

## Global Constraints

- No test suites in this repo (owner rule). Verification is builds, lint, `docker compose config`, and `curl` checks against running containers.
- Docker commands use the **`default`** context (`docker context use default`), never `rancher-desktop`.
- Host: `ledger.efficanova.com` for client and API. API base for the client build: `VITE_API_BASE_URL=https://ledger.efficanova.com` (code appends `/api`).
- Images: `ghcr.io/tusharlokhande/pocketledger-api` and `ghcr.io/tusharlokhande/pocketledger-client`, tags `latest` and `sha-<full commit sha>`.
- Deploy target: `/opt/apps/pocket-ledger`, SSH `deploy@ssh.tushar.sbs -p 2222`.
- External networks: `proxy` (Traefik), `observability` (collector `observability-otel:4317`, gRPC).
- Traefik labels: `entrypoints=websecure`, `tls.certresolver=letsencrypt`, `traefik.docker.network=proxy`.
- Postgres image `postgres:17-alpine`. Never publish Postgres, Azurite, Swagger, `/openapi` or `/health` to the host or Traefik.
- Prod database starts empty. No dev data is copied.
- Only prod. Deploy only on `push` to `main`; PRs build and check but never push images or deploy.
- Steps marked **[owner]** need the owner (sudo, DNS, Google console, GitHub settings). The implementer prepares the exact commands and waits.

## Review Focus

1. **Deep link refresh.** Reloading `https://ledger.efficanova.com/transactions` must serve the app (200, `index.html`), not a 404. Pinned in Task 1, Step 3.
2. **Stale app after deploy.** A browser must pick up a new deploy on its next load, so `index.html` is served `no-cache` while `/assets/*` (hashed) is cached long-term. Pinned in Task 1, Step 3.
3. **API down but deploy green.** If the API crash-loops (bad `.env`, failed migration), the Actions run must fail, not pass because nginx answered. Pinned in Task 3's post-deploy check (`/api/auth/refresh` must return 401).
4. **PC reboot.** After a reboot every service must come back without manual action (`restart: unless-stopped`, Docker enabled at boot). Pinned in Task 5, Step 6.
5. **Half-written backup.** A failed `pg_dump` must not leave a truncated `.dump` that looks valid, and must exit non-zero. Pinned in Task 2, Step 4.

---

### Task 1: Client image

**Files:**
- Create: `src/client/Dockerfile`
- Create: `src/client/nginx.conf`
- Create: `src/client/.dockerignore`

**Interfaces:**
- Produces: an image listening on port **80**, built with `--build-arg VITE_API_BASE_URL=…`, context `src/client`.

- [ ] **Step 1: Write `src/client/Dockerfile`**

Two stages: `node:24-alpine` runs `npm ci` then `npm run build` with `ARG VITE_API_BASE_URL` exported as `ENV` before the build. `nginx:1.27-alpine` copies `dist/` to `/usr/share/nginx/html` and `nginx.conf` to `/etc/nginx/conf.d/default.conf`. `EXPOSE 80`.

- [ ] **Step 2: Write `src/client/nginx.conf` and `.dockerignore`**

`nginx.conf`: one `server` on port 80 with these locations:
- `/assets/`: `Cache-Control: public, max-age=31536000, immutable`.
- `/`: `try_files $uri $uri/ /index.html`, with `Cache-Control: no-cache` on `index.html`.
- `gzip on` for js, css and svg.

`.dockerignore`: `node_modules`, `dist`, `.env*`.

- [ ] **Step 3: Build and verify**

```bash
docker context use default
cd src/client
docker build --build-arg VITE_API_BASE_URL=https://ledger.efficanova.com -t pl-client-test .
docker run -d --rm -p 8099:80 --name pl-client-test pl-client-test
curl -s -o /dev/null -w '%{http_code}\n' localhost:8099/                     # 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:8099/transactions         # 200 (SPA fallback)
curl -sI localhost:8099/ | grep -i cache-control                             # no-cache
A=$(curl -s localhost:8099/ | grep -o '/assets/[^"]*\.js' | head -1)
curl -sI localhost:8099$A | grep -i cache-control                            # max-age=31536000, immutable
docker exec pl-client-test sh -c 'grep -l "ledger.efficanova.com/api" /usr/share/nginx/html/assets/*.js'   # prints a file
docker exec pl-client-test sh -c 'grep -L "localhost:5106" /usr/share/nginx/html/assets/*.js | wc -l'      # = number of js files
docker stop pl-client-test
```

- [ ] **Step 4: Commit**

```bash
git add src/client/Dockerfile src/client/nginx.conf src/client/.dockerignore
git commit -m "build: Add client Docker image with nginx SPA serving"
```

---

### Task 2: Prod compose, env template, backup script

**Files:**
- Create: `deploy/compose.yaml`
- Create: `deploy/.env.example`
- Create: `deploy/backup.sh` (executable)

**Interfaces:**
- Consumes: the client image from Task 1 (port 80), the existing `src/server/Dockerfile` (port 8080).
- Produces: `deploy/compose.yaml` and `deploy/backup.sh`. Task 3 copies both to `/opt/apps/pocket-ledger/`. Compose reads `IMAGE_TAG` (default `latest`) and `env_file: .env`.

- [ ] **Step 1: Write `deploy/compose.yaml`**

Use the services table in the spec ("Prod stack"), with these specifics:
- **`api`**:
  - `env_file: .env`, `restart: unless-stopped`.
  - Networks: `default`, `proxy`, `observability`.
  - `depends_on` postgres `service_healthy` and azurite `service_started`.
  - Router `pocketledger-api` with rule ``Host(`ledger.efficanova.com`) && PathPrefix(`/api`)``, service port `8080`.
- **`client`**:
  - Networks: `default`, `proxy`.
  - Router `pocketledger-client` with rule ``Host(`ledger.efficanova.com`)``, port `80`.
- **`postgres`**:
  - `env_file: .env`, `PGDATA: /var/lib/postgresql/data/pgdata`.
  - Volume `./data/postgres:/var/lib/postgresql/data`.
  - Healthcheck `pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}`, interval 10s, retries 5.
- **`azurite`**:
  - Command `azurite-blob --blobHost 0.0.0.0 --location /data --skipApiVersionCheck`.
  - `environment: AZURITE_ACCOUNTS: ${AZURITE_ACCOUNTS}`, volume `./data/azurite:/data`.
- All four services: `restart: unless-stopped`, no `ports:` anywhere.
- `proxy` and `observability` are declared `external: true`.

- [ ] **Step 2: Write `deploy/.env.example`**

Copy the key list from the spec's "Production `.env`" block exactly. Secrets are left empty, and the non-secret values are filled in as shown in the spec (URLs, OTEL settings, `IMAGE_TAG=latest`, `ASPNETCORE_ENVIRONMENT=Production`).

- [ ] **Step 3: Validate compose**

```bash
cd deploy && cp .env.example .env && docker compose config -q && echo OK; rm .env
```
Expected: `OK`, with no warnings about undefined variables other than empty secrets.
Then: `docker compose config | grep -c 'published'` → `0` (no host ports).

- [ ] **Step 4: Write `deploy/backup.sh`**

This is exact behaviour, so the body is given:

```bash
#!/usr/bin/env bash
# Nightly Postgres backup for /opt/apps/pocket-ledger. Keeps 14 days.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
out="backups/ledger-$(date +%Y%m%d).dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$out.tmp"
mv "$out.tmp" "$out"
find backups -name 'ledger-*.dump' -mtime +14 -delete
```
Verify the failure path without a running stack: `cd deploy && cp .env.example .env && ./backup.sh; echo "exit=$?"; ls backups; rm -rf .env backups`. Expected: `exit=` non-zero and no `ledger-*.dump` file, only a `.tmp` at most. The success path is verified in Task 5.

- [ ] **Step 5: Commit**

```bash
chmod +x deploy/backup.sh
git add deploy/
git commit -m "build: Add production compose stack, env template and backup script"
```

---

### Task 3: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/cicd.yml`

**Interfaces:**
- Consumes: `src/client/Dockerfile` (Task 1), `src/server/Dockerfile` (exists, context `src/server`), `deploy/compose.yaml` and `deploy/backup.sh` (Task 2).
- Produces: repo secret `DEPLOY_SSH_KEY`, repo variable `DEPLOY_KNOWN_HOSTS`, GitHub environment `production`. All three are created by the owner in Task 5.

- [ ] **Step 1: Write the workflow**

Use `~/Projects/finora-v2/.github/workflows/cicd.yml` as the reference shape. Differences:
- **Triggers:** `push` to `main` and `pull_request` to `main` only. `permissions: contents: read, packages: write`.
- **Job `check`:**
  - Node 24 `actions/setup-node` with npm cache on `src/client/package-lock.json`. Run `npm ci && npm run lint && npm run build` in `src/client`.
  - `actions/setup-dotnet` 10.0.x, then `dotnet build src/server/Ledger.slnx -c Release`.
- **Job `images`** (needs `check`):
  - Buildx and a GHCR login, with the login only on `push`.
  - Build both images. `push: ${{ github.event_name == 'push' }}`.
  - Tags `latest` and `sha-${{ github.sha }}`, with the image names from Global Constraints.
  - Client build arg `VITE_API_BASE_URL=https://ledger.efficanova.com`.
  - GHA cache scopes `api` and `client`.
- **Job `deploy`:**
  - Needs `images`, `if: github.event_name == 'push'`, `environment: production`.
  - `concurrency: { group: deploy-prod, cancel-in-progress: false }`.
  - `actions/checkout`, then write `secrets.DEPLOY_SSH_KEY` to `~/.ssh/deploy` (mode 600) and `vars.DEPLOY_KNOWN_HOSTS` to `~/.ssh/known_hosts`.
  - `scp -P 2222 deploy/compose.yaml deploy/backup.sh deploy@ssh.tushar.sbs:/opt/apps/pocket-ledger/`.
  - SSH `set -e; cd /opt/apps/pocket-ledger; chmod +x backup.sh; docker compose pull; docker compose up -d --remove-orphans; docker image prune -f`.
- **Post-deploy check step** in `deploy`: loop up to 12 times with 5 s sleeps. Pass when both conditions hold, otherwise `exit 1`:
  - `curl -s -o /dev/null -w '%{http_code}' https://ledger.efficanova.com/` is `200`.
  - `curl -s -o /dev/null -w '%{http_code}' -X POST https://ledger.efficanova.com/api/auth/refresh` is `401`.

- [ ] **Step 2: Lint the workflow**

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color
```
Expected: no output, exit 0.

- [ ] **Step 3: Commit (do not push yet: secrets don't exist until Task 5)**

```bash
git add .github/workflows/cicd.yml
git commit -m "ci: Add CI checks, GHCR image builds and SSH deploy to prod"
```

---

### Task 4: Retire finora

**Files:** none in the repo. These are one-time commands on the PC. Archive: `/opt/apps/finora-backup-2026-11-04/`.

**Interfaces:**
- Produces: `/opt/apps/finora` removed, finora containers and images gone, and an archive the owner can restore from.

- [ ] **Step 1: [owner] Archive the data. Nothing is deleted before Step 2 passes.**

```bash
docker context use default
sudo mkdir -p /opt/apps/finora-backup-2026-11-04
docker start dev-postgres-1 && sleep 5
docker exec dev-postgres-1 sh -c 'pg_dumpall -U "$POSTGRES_USER"' | sudo tee /opt/apps/finora-backup-2026-11-04/finora-dev.sql >/dev/null
docker stop dev-postgres-1
sudo tar czf /opt/apps/finora-backup-2026-11-04/finora-dev-data.tar.gz -C /opt/apps/finora/dev data
```

- [ ] **Step 2: Verify the archive**

```bash
sudo grep -c 'CREATE TABLE' /opt/apps/finora-backup-2026-11-04/finora-dev.sql   # > 0
sudo tar tzf /opt/apps/finora-backup-2026-11-04/finora-dev-data.tar.gz | grep -c pgdata   # > 0
```
If either prints `0`, stop and report to the owner.

- [ ] **Step 3: [owner] Remove finora**

```bash
(cd /opt/apps/finora/dev && docker compose down)
(cd /opt/apps/finora/prod && docker compose down)
sudo rm -rf /opt/apps/finora
docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -i finora | xargs -r docker image rm
```
Verify: `docker ps -a | grep -ci finora` → `0`, and `ls /opt/apps` shows no `finora`.

- [ ] **Step 4: [owner] Disable finora-v2 deploys**

In GitHub, open `TusharLokhande/finora-v2`, then Settings → Secrets → delete `FINORA_SSH_PRIVATE_KEY`, or disable the `deploy` job. Do **not** remove the `deploy` user or its authorized key on this PC, because ledger uses them.

---

### Task 5: Server setup, first deploy, verification

**Files:** none in the repo. Work happens on the PC and in GitHub settings.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: [owner] DNS and Google**

- Add an A record `ledger.efficanova.com → 45.248.65.9`. Verify: `getent hosts ledger.efficanova.com` prints that IP.
- In Google Cloud console, add redirect URI `https://ledger.efficanova.com/api/auth/google/callback` and JavaScript origin `https://ledger.efficanova.com` to the existing OAuth web client.

- [ ] **Step 2: Start observability**

```bash
cd /opt/apps/observability && docker compose up -d
docker ps --format '{{.Names}}' | grep -c '^observability-'   # 7
```

- [ ] **Step 3: [owner] Prepare `/opt/apps/pocket-ledger`**

```bash
sudo chown deploy:deploy /opt/apps/pocket-ledger && sudo chmod 700 /opt/apps/pocket-ledger
sudo -u deploy mkdir -p /opt/apps/pocket-ledger/{data/postgres,data/azurite,backups}
```
The implementer generates the secret values and hands them over:
- `openssl rand -base64 48` for `Jwt__SigningKey`.
- `openssl rand -base64 64` for the Azurite key, with account name `pocketledger`.
- `openssl rand -hex 24` for the Postgres password.

The owner writes `/opt/apps/pocket-ledger/.env` from `deploy/.env.example`, adding those values and the Google client ID and secret. Then `sudo chown deploy:deploy .env && sudo chmod 600 .env`.

- [ ] **Step 4: [owner] GitHub settings, then push**

- Repo `TusharLokhande/ledger` → Settings:
  - Secret `DEPLOY_SSH_KEY` = contents of `~/.ssh/github_actions_finora`.
  - Variable `DEPLOY_KNOWN_HOSTS` = output of `ssh-keyscan -p 2222 ssh.tushar.sbs`.
  - Environment `production`.
- `git push origin main`. The first `deploy` job is expected to fail at `docker compose pull` because the GHCR packages are private.
- In GitHub → Packages, set `pocketledger-api` and `pocketledger-client` to **Public**, then re-run the failed `deploy` job.
- Expected: all three jobs green, and the post-deploy check passes.

- [ ] **Step 5: Verify live**

```bash
curl -sI https://ledger.efficanova.com/ | head -1                                         # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://ledger.efficanova.com/transactions        # 200
curl -s -o /dev/null -w '%{http_code}\n' https://ledger.efficanova.com/swagger/index.html  # not 200 (client SPA or 404, never Swagger)
curl -s https://ledger.efficanova.com/swagger/index.html | grep -c 'swagger-ui'            # 0
echo | openssl s_client -connect ledger.efficanova.com:443 -servername ledger.efficanova.com 2>/dev/null | grep -i "issuer"   # Let's Encrypt
```
In a browser, sign in with Google, reload the page (the session must survive), add a transaction, and upload an avatar or import a file (this proves Azurite works).
In Grafana (`grafana.tushar.sbs`), Tempo should have traces for service `pocketledger-api` and Loki should have its logs.

- [ ] **Step 6: Backups and reboot**

- Run `sudo -u deploy /opt/apps/pocket-ledger/backup.sh && ls -la /opt/apps/pocket-ledger/backups`. Expected: one non-empty `ledger-YYYYMMDD.dump`.
- [owner] `sudo crontab -u deploy -e` and add `15 3 * * * /opt/apps/pocket-ledger/backup.sh`.
- [owner] Reboot the PC. Afterwards, with no manual action, `curl -s -o /dev/null -w '%{http_code}' https://ledger.efficanova.com/` returns `200`, and `docker ps` shows all 4 pocket-ledger containers and Traefik.
