# Atlas Hub — production deploy runbook

**Audience:** HVCG Owner (Manny) or CI with an authenticated Azure session.  
**Agent note:** Cloud agents in this workspace **cannot** run `az login`. They may prepare docs/PRs only; production Hub deploy is Owner-interactive.

## Current production truth (2026-09-09)

| Surface | URL / resource | Commit / SHA |
|--------|----------------|--------------|
| **Live Hub** | `https://app-atlas-integration-hub.azurewebsites.net` (`app-atlas-integration-hub` / `rg-atlas-prod`) | `2d61fe65603b88d12d08456967c65dae8e5aec52` |
| **Deploy target** | `origin/production/atlas-core` tip | `0e95388dc46eb40884f9d0c461678e66c533db4c` (`0e95388d`) |
| **Live Elite SWA** | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` (`swa-atlas-elite-os-dev` / `rg-atlas-dev`) | `b504e12245e57b016e2bab934ebb44e55747a7e8` (verified from live bundle) |

Live Hub is an **ancestor** of `production/atlas-core` tip. Forward deploy is **safe and required** to pick up Waves 0–10 plus **HMAC key-id hardening** on live ingest.

**Do not redeploy Elite** just to make its SHA match Hub. Hub and Elite ship on independent cadences; `deploy-hub-guarded.sh` blocks cosmetic SHA-equalization unless `ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1`.

## Prerequisites

1. Azure CLI logged in to HVCG Production:
   - Tenant: `3df46563-86f3-4414-87fd-84ba967741ef`
   - Subscription: `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`
2. Repo clone with `bash`, `git`, `node` 20+, `npm`, `zip`, `curl`, `jq`.
3. `npm ci` at repo root (esbuild bundle).

## Owner deploy sequence

```bash
az login
cd /path/to/hvcg-05
git fetch origin production/atlas-core
git checkout production/atlas-core
git pull origin production/atlas-core
npm ci
export ATLAS_ELITE_SHA="$(./scripts/read-live-elite-sha.sh)"
./scripts/deploy-hub-guarded.sh
curl -sf https://app-atlas-integration-hub.azurewebsites.net/health | jq -r .commit
git rev-parse HEAD   # must match /health commit
```

### One-liner (after `az login`, from repo root)

```bash
git fetch origin production/atlas-core && git checkout production/atlas-core && git pull origin production/atlas-core && npm ci && export ATLAS_ELITE_SHA="$(./scripts/read-live-elite-sha.sh)" && ./scripts/deploy-hub-guarded.sh && test "$(curl -sf https://app-atlas-integration-hub.azurewebsites.net/health | jq -r .commit)" = "$(git rev-parse HEAD)" && echo "Hub deploy verified"
```

## What the guarded script does

1. Reads live Hub `/health` commit.
2. Acquires deploy lease (`sthvcgwebintake` blob lease, flock fallback).
3. Runs ancestry guard (`scripts/deploy-guard-check.mjs` + `deployLineageGuard.ts`).
4. Bundles `apps/atlas-integration-api` with esbuild → zip → `az webapp deploy`.
5. Verifies `/health.commit` equals `git rev-parse HEAD`.
6. Records production state to deploy-control blob (when Azure lease mode succeeds).

Environment overrides:

| Variable | Purpose |
|----------|---------|
| `ATLAS_CANONICAL_PRODUCTION_SHA` | Production floor (default `0e95388d…`). |
| `ATLAS_ELITE_SHA` | Live Elite SHA for equalization guard (set from SWA, not Hub tip). |
| `ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1` | Bypass equalization block (discouraged). |
| `HUB_BASE` | Hub URL for health checks (default production). |
| `ELITE_BASE` | Elite SWA URL for `read-live-elite-sha.sh`. |

## Verify Elite SHA (manual)

```bash
./scripts/read-live-elite-sha.sh
# or
curl -sf https://zealous-rock-0090c7e1e.7.azurestaticapps.net/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

Expected live value (2026-09-09): `b504e12245e57b016e2bab934ebb44e55747a7e8`.

## CI / GitHub Actions

- `.github/workflows/hvcg-os-release.yml` — legacy SharePoint OS checklist; **forbidden** for Hub/Elite zip deploy.
- `.github/workflows/atlas-release-control.yml` — dry validation only; **does not deploy**.
- No `azure/login` OIDC workflow exists in this repo. Do **not** add a fragile Hub deploy workflow without a registered federated identity and secrets review. Prefer this runbook + Owner workstation.

## Rollback

Prior Hub bundles may exist under `deployment/artifacts/hub-rollback/` (gitignored). Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1`. Roll back only for P0/P1; do not roll back a healthy forward deploy.

## Related scripts

- `deployment/scripts/Deploy-HVCGCapitalHub.ps1 -Apply` — delegates to `scripts/deploy-hub-guarded.sh` after bundling.
- `scripts/deploy-swa-dev.sh` — Elite SWA deploy (separate path; not part of Hub deploy).
