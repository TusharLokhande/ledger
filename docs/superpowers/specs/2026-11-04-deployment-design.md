# Production deployment — design

Date: 2026-11-04 · Status: approved

## Intent

PocketLedger replaces finora as the app self-hosted on the owner's PC, served at
**`https://ledger.efficanova.com`**. The repo (`github.com/TusharLokhande/ledger`, public) is also
the owner's GitHub showcase and will keep growing, so deployment must be hands-off and visible:
a push to `main` ships it, and the Actions tab shows whether it worked.

## Goals

- One environment, **prod only**, in `/opt/apps/pocket-ledger`.
- One host for both client and API: client at `/`, API at `/api` (Traefik path routing).
- Push to `main` → GitHub Actions builds images → pushes to GHCR → SSHes into this PC → `docker compose pull && up -d`.
- API telemetry (traces, metrics, logs) goes to the existing observability stack in `/opt/apps/observability`.
- Finora retired: stopped, its database archived, then removed.

## Non-goals

- No dev/staging environment, no `dev` branch deploys.
- No rename: the app stays **PocketLedger** (owner considered "Finora"; kept PocketLedger to avoid
  clashing with the separate `finora-v2` showcase repo and its GHCR images).
- No app code changes. Everything is config, Dockerfiles, compose, and a workflow.
- No Kubernetes. Rancher Desktop's k8s is unrelated; all work uses the `default` Docker context.

## Anti-goals

- A self-hosted Actions runner on this PC (public repo → PRs could run code on the owner's machine).
- Exposing Postgres, Azurite, Swagger, or `/health` to the internet.
- Deleting finora's data without an archive.

## Constraints (current state of the PC, `default` Docker context)

- Traefik (`/opt/apps/traefik`, `traefik:v3.6`) is **running**, owns :80/:443, Let's Encrypt
  resolver `letsencrypt` (HTTP challenge), Docker provider with `exposedbydefault=false`.
- External Docker networks `proxy` and `observability` already exist.
- Observability stack (`/opt/apps/observability`: Grafana, Prometheus, Loki, Tempo, OTel collector)
  is **stopped**; images are present. Collector container name `observability-otel`, OTLP gRPC on 4317.
  Grafana is at `grafana.tushar.sbs`.
- Finora: no prod containers; dev containers exited 7 weeks ago but still exist (`dev-postgres-1`,
  postgres:18, stopped). Its live data dir is `/opt/apps/finora/dev/data/data/postgres` (uid 999,
  mode 700, needs sudo to read). `/opt/apps/finora/dev/data/postgres/pgdata` (~72 MB, Oct 3) is an
  older copy nothing mounts. `/opt/apps/finora/prod/data` is empty. Old finora images remain.
- `/opt/apps/pocket-ledger` exists, empty, owned by root. The owner (`tushar`) has no passwordless sudo.
- Deploy access already exists from finora: user `deploy` (in `docker` group), reached by GitHub
  Actions at `deploy@ssh.tushar.sbs -p 2222` with key pair `~/.ssh/github_actions_finora`.
  Reference workflow: `~/Projects/finora-v2/.github/workflows/cicd.yml`.
- DNS: `ledger.efficanova.com` has **no record yet**; other efficanova hosts resolve to 45.248.65.9.
- App facts that shape the deploy:
  - Client reads `VITE_API_BASE_URL` at **build time**; without it falls back to `http://localhost:5106`.
    Code appends `/api`, so the build arg is `https://ledger.efficanova.com`.
  - Refresh cookie is `Secure`, `SameSite=Strict`, path `/api/auth`; OAuth cookie `Lax`, path
    `/api/auth/google`. Same-host routing keeps these first-party.
  - API runs EF migrations on startup; Hangfire runs in-process on Postgres. No extra services.
  - API needs Postgres and Azure Blob storage (Azurite in dev) for imports and avatars.
  - OTLP export activates only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
  - Server Dockerfile exists (`src/server/Dockerfile`, context `src/server`, listens 8080). Client has none.

## Approaches considered

1. **GitHub builds → GHCR → SSH deploy** — finora's proven pattern; GitHub shows deploy pass/fail.
   Keeps SSH :2222 open (already is). **Chosen.**
2. GHCR + Watchtower polling on the PC — no inbound SSH, but GitHub can't tell if the deploy
   succeeded; deploy timing is up to the poll interval.
3. Self-hosted runner on the PC — no registry/SSH, but unsafe for a public repo. Rejected.

## Design

### Repo additions

- `src/client/Dockerfile` — Node build stage (`npm ci && npm run build`, build arg
  `VITE_API_BASE_URL`) → nginx stage serving `dist/`.
- `src/client/nginx.conf` — SPA fallback (`try_files $uri /index.html`), long cache for hashed
  `/assets/`, no cache for `index.html`.
- `src/client/.dockerignore` — `node_modules`, `dist`.
- `deploy/compose.yaml` — the prod stack (below). Tracked in git; copied to the PC on deploy.
- `deploy/.env.example` — every key, no values.
- `.github/workflows/cicd.yml` — CI + deploy (below).

### Prod stack (`/opt/apps/pocket-ledger`)

```
compose.yaml   .env (chmod 600)   data/postgres/   data/azurite/   backups/
```

| Service | Image | Networks | Exposure |
|---|---|---|---|
| client | `ghcr.io/tusharlokhande/pocketledger-client:${IMAGE_TAG:-latest}` | default, proxy | ``Host(`ledger.efficanova.com`)`` → :80 |
| api | `ghcr.io/tusharlokhande/pocketledger-api:${IMAGE_TAG:-latest}` | default, proxy, observability | ``Host(`ledger.efficanova.com`) && PathPrefix(`/api`)`` → :8080 |
| postgres | `postgres:17-alpine` (matches dev) | default | none; healthcheck `pg_isready` |
| azurite | `mcr.microsoft.com/azure-storage/azurite` (`azurite-blob`) | default | none |

All `restart: unless-stopped`, Traefik labels with `entrypoints=websecure`,
`tls.certresolver=letsencrypt`, `traefik.docker.network=proxy`. API `depends_on` Postgres healthy.
Bind mounts under `./data/` (same as finora). Azurite uses a custom account via `AZURITE_ACCOUNTS`,
not the public dev key.

### Production `.env` (values only on the PC)

```
ASPNETCORE_ENVIRONMENT=Production
POSTGRES_USER= POSTGRES_PASSWORD= POSTGRES_DB=
ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=…;Username=…;Password=…
AZURITE_ACCOUNTS=<account>:<base64 key>
ConnectionStrings__BlobStorage=DefaultEndpointsProtocol=http;AccountName=<account>;AccountKey=<key>;BlobEndpoint=http://azurite:10000/<account>;
Jwt__SigningKey=<openssl rand -base64 48>
Cors__AllowedOrigins__0=https://ledger.efficanova.com
Google__ClientId= Google__ClientSecret=
Google__RedirectUri=https://ledger.efficanova.com/api/auth/google/callback
Client__BaseUrl=https://ledger.efficanova.com
OTEL_SERVICE_NAME=pocketledger-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://observability-otel:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
IMAGE_TAG=latest
```

### Workflow (`.github/workflows/cicd.yml`)

- **On pull request to `main`:** client `npm ci`, `npm run lint`, `npm run build` (includes `tsc -b`);
  server `dotnet build`; build both Docker images without pushing. No deploy.
- **On push to `main`:** same checks, then build and push both images tagged `latest` and
  `sha-<commit>` (GHA build cache), then a `deploy` job (`environment: production`,
  `concurrency` without cancel) that SSHes as `deploy@ssh.tushar.sbs:2222` and runs, in
  `/opt/apps/pocket-ledger`: write the repo's `deploy/compose.yaml` over the existing one,
  `docker compose pull`, `docker compose up -d --remove-orphans`, `docker image prune -f`.
- Secret: `DEPLOY_SSH_KEY` (the existing finora deploy private key). Host key pinned in a repo
  variable `DEPLOY_KNOWN_HOSTS` rather than `ssh-keyscan` each run.
- After deploy, the job checks `https://ledger.efficanova.com/` returns 200 (client) and
  `POST /api/auth/refresh` without a cookie returns 401 (API routed and up), retrying for ~60s;
  otherwise the run fails.
- First deploy: GHCR packages start private, so the first deploy's pull fails. Owner makes both
  packages public, then re-runs the job.

### Observability

Start the existing stack (`docker compose up -d` in `/opt/apps/observability`). The API joins the
`observability` network and exports to `observability-otel:4317`. Container stdout is already
scraped by the collector's `filelog/docker` receiver. Grafana dashboards are out of scope.

### Backups

Nightly cron for user `deploy` (or `tushar`): `docker compose exec -T postgres pg_dump -Fc`
into `/opt/apps/pocket-ledger/backups/ledger-YYYYMMDD.dump`, delete dumps older than 14 days.
Backups stay on this PC only. Off-machine copies are a later decision.

### Retiring finora (one-time, manual on the PC)

1. `docker start dev-postgres-1`, then `pg_dumpall` from it into
   `/opt/apps/finora-backup-2026-11-04/finora-dev.sql`, and stop it again. Also
   `sudo tar czf /opt/apps/finora-backup-2026-11-04/finora-dev-data.tar.gz -C /opt/apps/finora/dev data`
   (both the live and the old copy). Verify the dump is non-empty and the archive lists files
   before step 2.
2. Remove finora containers (`docker compose down` in both dirs), then `/opt/apps/finora`.
3. `docker image rm` the finora images.
4. Owner disables the `deploy` job in `finora-v2`'s workflow (or deletes its `FINORA_SSH_PRIVATE_KEY`
   secret) so pushes there stop trying to reach this PC. Its build checks, code and GHCR packages
   stay as they are. The `deploy` user and key on this PC stay, since ledger reuses them.

### One-time setup the owner does

- DNS: A record `ledger.efficanova.com → 45.248.65.9`.
- Google Cloud console: add redirect URI `https://ledger.efficanova.com/api/auth/google/callback`
  and JavaScript origin `https://ledger.efficanova.com`.
- GitHub repo settings: secret `DEPLOY_SSH_KEY`, variable `DEPLOY_KNOWN_HOSTS`, environment
  `production`. After the first push, set both GHCR packages to **public** so the PC can pull
  without a registry login (matches a public showcase repo).
- With sudo: `chown deploy:deploy /opt/apps/pocket-ledger`; create the `.env` there.

## Decided by the owner

Prod only · `ledger.efficanova.com` for client and API · push-to-`main` auto-deploy · approach 1 ·
use the existing observability stack · keep the name PocketLedger · archive finora's data before removing it ·
prod database starts **empty** (no dev data carried over) · disable finora-v2's deploy job.

## My calls (owner can override)

- GHCR names `pocketledger-api` / `pocketledger-client`, tagged `latest` and `sha-<commit>`.
  Each deploy pins `IMAGE_TAG=sha-<commit>` in `.env`. Rollback: set an older `sha-…` there, then `docker compose up -d`; the next push to `main` moves it forward again.
- PR checks (lint/type-check/build) for the showcase.
- Postgres 17 (same as dev). Nightly `pg_dump` with 14-day retention.
- Swagger, OpenAPI, and `/health` not routed publicly.
- Compose file lives in git and the deploy job copies it, so infra changes ship through PRs too.
- Finora archive = `pg_dumpall` from the stopped container plus a sudo tar of the whole data tree.
- Post-deploy check covers both client and API.
- Azurite stays as the blob store in prod (no code change); a real object store is a later swap.

## Left to the builder

nginx tuning details, exact workflow step layout and action versions, cron vs systemd timer for backups.
