# Atlas Hub — production deploy runbook

**Audience:** HVCG Owner (Manny) or CI with an authenticated Azure session.  
**Agent note:** Cloud agents in this workspace **cannot** run `az login`. They may prepare docs/PRs only; production Hub deploy is Owner-interactive.

## SHA terminology (do not conflate)

| Concept | Meaning | How resolved |
|--------|---------|--------------|
| **LIVE_PRODUCTION** | Commit currently serving Hub `/health` | `curl …/health \| jq -r .commit` |
| **CURRENT_CANDIDATE** | Deploy target — always `origin/production/atlas-core` HEAD | `git fetch && git rev-parse origin/production/atlas-core` |
| **HISTORICAL_FLOOR** | Wave 0 ancestry evidence (not a deploy target) | Default `2d61fe65603b88d12d08456967c65dae8e5aec52`; override `ATLAS_HISTORICAL_FLOOR_SHA` |
| **LIVE_ELITE** | Elite SWA bundle SHA (independent cadence) | `./scripts/read-live-elite-sha.sh` |

**Never** hard-code a stale tip snapshot as the deploy target. Scripts resolve **CURRENT_CANDIDATE** at runtime.

## Reference snapshot (2026-09-09 — verify live before deploy)

| Surface | URL / resource | Example SHA |
|--------|----------------|-------------|
| **LIVE_PRODUCTION (Hub)** | `https://app-atlas-integration-hub.azurewebsites.net` | `2d61fe65603b88d12d08456967c65dae8e5aec52` |
| **CURRENT_CANDIDATE** | `origin/production/atlas-core` tip | `775b602d8d0d5310e8710db5ffca26154a978245` (fetch fresh) |
| **HISTORICAL_FLOOR** | Wave 0 Hub lineage | `2d61fe65603b88d12d08456967c65dae8e5aec52` |
| **LIVE_ELITE (SWA)** | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` | `b504e12245e57b016e2bab934ebb44e55747a7e8` |

LIVE_PRODUCTION is an **ancestor** of CURRENT_CANDIDATE when forward deploy is safe. Guard scripts enforce this before `az webapp deploy`.

**Do not redeploy Elite** to make its SHA match Hub. Hub and Elite ship on independent cadences; `deploy-hub-guarded.sh` blocks cosmetic SHA-equalization unless `ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1`.

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
./scripts/local-hub-deploy.sh
```

Or step-by-step:

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
git rev-parse origin/production/atlas-core   # must match /health commit after deploy
```

## What the guarded script does

1. Fetches `origin/production/atlas-core` → **CURRENT_CANDIDATE**.
2. Reads **LIVE_PRODUCTION** from Hub `/health`.
3. Verifies LIVE_PRODUCTION is an ancestor of CURRENT_CANDIDATE.
4. Reads **LIVE_ELITE** via `read-live-elite-sha.sh` (or `ATLAS_ELITE_SHA`).
5. Acquires deploy lease (`sthvcgwebintake` blob lease, flock fallback).
6. Runs ancestry guard against **HISTORICAL_FLOOR** + live lineage.
7. Bundles `apps/atlas-integration-api` with esbuild → zip → `az webapp deploy`.
8. Verifies `/health.commit` equals CURRENT_CANDIDATE.
9. Records production state to deploy-control blob (when Azure lease mode succeeds).

Environment overrides:

| Variable | Purpose |
|----------|---------|
| `ATLAS_HISTORICAL_FLOOR_SHA` | Wave 0 floor for ancestry checks (default `2d61fe65…`). |
| `ATLAS_PRODUCTION_BRANCH` | Branch to resolve CURRENT_CANDIDATE (default `production/atlas-core`). |
| `ATLAS_ELITE_SHA` | Live Elite SHA for equalization guard (set from SWA, not Hub tip). |
| `ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1` | Bypass equalization block (discouraged). |
| `HUB_BASE` | Hub URL for health checks (default production). |
| `ELITE_BASE` | Elite SWA URL for `read-live-elite-sha.sh`. |

## Verify Elite SHA (manual)

```bash
./scripts/read-live-elite-sha.sh
```

## CI / GitHub Actions

- `.github/workflows/hvcg-os-release.yml` — legacy SharePoint OS checklist; **forbidden** for Hub/Elite zip deploy.
- `.github/workflows/atlas-release-control.yml` — dry validation only; **does not deploy**.
- No `azure/login` OIDC workflow exists in this repo. Prefer this runbook + Owner workstation / Local Cursor handoff.

## Rollback

Prior Hub bundles may exist under `deployment/artifacts/hub-rollback/` (gitignored). Restore with `deployment/scripts/Rollback-HVCGCapitalHub.ps1`. Roll back only for P0/P1; do not roll back a healthy forward deploy.

## Related scripts

- `scripts/local-hub-deploy.sh` — Owner wrapper (assumes `az login`).
- `docs/LOCAL_CURSOR_HUB_DEPLOY_HANDOFF.md` — paste-once prompt for Local Cursor after Owner auth.
- `deployment/scripts/Deploy-HVCGCapitalHub.ps1 -Apply` — delegates to `scripts/deploy-hub-guarded.sh` after bundling.
- `scripts/deploy-swa-dev.sh` — Elite SWA deploy (separate path; not part of Hub deploy).
