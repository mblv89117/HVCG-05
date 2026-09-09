# Local Cursor — Hub production deploy handoff

**Owner action first:** run `az login` (HVCG tenant `3df46563-86f3-4414-87fd-84ba967741ef`, subscription `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`). Do not paste long shell commands — Local Cursor runs them.

---

## Prompt (paste into Local Cursor after `az login`)

```
Hub production deploy — hvcg-05 (Owner already ran az login).

Goal: forward-deploy Atlas Integration Hub to CURRENT_CANDIDATE (origin/production/atlas-core HEAD). Do NOT claim success until /health.commit matches.

Steps:
1. Detect hvcg-05 repo path on this machine (search for deploy-hub-guarded.sh if needed).
2. cd to repo root; git fetch origin production/atlas-core.
3. Record before state:
   - LIVE_PRODUCTION = curl -sf https://app-atlas-integration-hub.azurewebsites.net/health | jq -r .commit
   - CURRENT_CANDIDATE = git rev-parse origin/production/atlas-core
   - LIVE_ELITE = ./scripts/read-live-elite-sha.sh
   - Confirm LIVE_PRODUCTION is git ancestor of CURRENT_CANDIDATE (merge-base --is-ancestor).
4. Run: ./scripts/local-hub-deploy.sh
   (or npm ci + export ATLAS_ELITE_SHA + ./scripts/deploy-hub-guarded.sh if wrapper missing)
5. Post-deploy verify:
   - /health.commit == CURRENT_CANDIDATE
   - Print LIVE_PRODUCTION, CURRENT_CANDIDATE, HISTORICAL_FLOOR (2d61fe65), LIVE_ELITE
6. Smoke ClientCode isolation if feasible (Hub /health + one entitled vs non-entitled route without cross-tenant bleed).
7. Write evidence file docs/evidence/hub-deploy-YYYYMMDD-HHMM.md with all SHAs, ancestry OK/FAIL, /health output, and az account name. Do NOT mark Hub as live-deployed in git unless Owner confirms.

Constraints:
- Cloud agents cannot az login; this is Owner workstation only.
- Never treat HISTORICAL_FLOOR or a stale tip snapshot as the deploy target.
- Do not redeploy Elite to match Hub SHA.
- Do not equalize SHAs unless ATLAS_ALLOW_SHA_EQUALIZE_DEPLOY=1 (discouraged).

Runbook: docs/hub-production-deploy-runbook.md
```

---

## What Owner does vs Local Cursor

| Owner | Local Cursor |
|-------|--------------|
| `az login` | Find repo, fetch tip, deps, deploy, verify, evidence |
| Confirm deploy intent | Run `./scripts/local-hub-deploy.sh` |
| Review evidence file | Smoke tests, ancestry checks |
