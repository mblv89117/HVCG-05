# HVCG V2 — Owner UAT Runtime Manifest

**Control:** `CORRECT_RUNTIME_PROVENANCE`  
**As of:** 2026-08-12T18:35:00Z (America/Los_Angeles session)  
**Phase:** Guided Owner UAT — UAT-01 Client Intake retest  
**Git remediation:** `UNCOMMITTED_PENDING_OWNER_REVIEW`

## Runtime lock

| Item | Value |
|------|--------|
| Timestamp (verified) | 2026-08-12 ~11:36 PT |
| Elite address | `http://127.0.0.1:5180` |
| Elite worktree | `atlas-usable-operating-layer` |
| Elite branch | `fix/atlas-usable-operating-layer` |
| Elite HEAD SHA | `b92abf3f6effcc0c13073168730a1d97e44e87f6` (`b92abf3`) |
| Elite git state | Dirty — UAT-FIND-001 remediation uncommitted (ahead 12 of origin) |
| Elite process identity | Vite PID **5141** · cwd `…/atlas-usable-operating-layer/apps/atlas-elite-os` · `--strictPort` |
| Auth mode (Owner UI) | **Local Owner (Dev)** — `VITE_ALLOW_DEV_OWNER_LOGIN=true` · `VITE_ATLAS_ENV=local` · browser-proven HVCG Owner |
| Elite footer env | `local` · SHA `b92abf3+uat-find001` · banner LOCAL OWNER SESSION when active |
| UAT-ENV-002 | Remediated — Local Owner path works without Entra client ID |
| Hub address | `http://127.0.0.1:8792` |
| Hub worktree | `atlas-usable-operating-layer` / `apps/atlas-integration-api` |
| Hub auth mode | `INTEGRATION_REQUIRE_AUTH=false` (Dev UAT) |
| Auth Hub (JWT fail-closed probe) | `:8793` retained (`INTEGRATION_REQUIRE_AUTH=true`) |
| BA worktree | `hvcg-business-architecture-v2` |
| BA branch | `cursor/hvcg-business-architecture-v2` |
| BA HEAD SHA | `2490989a1f47ac6a0f502be045c91cbbf8a34b5e` (`2490989`) |
| BA path (binding) | `…/hvcg-business-architecture-v2/config/business` |
| Data mode | Development Lead adapter `DEV_LEAD_ADAPTER` · `.data/dev-leads/` |
| Production connection | **false** |
| Track 1 write | **false** |
| Gates opened | **none** |

## Owner-visible identity

`Elite UAT build · fix/atlas-usable-operating-layer · b92abf3+uat-find001`

Footer: `local` · SHA `b92abf3+uat-find001` · after Local Owner: **LOCAL OWNER SESSION (DEV ONLY)** · **role HVCG Owner**

## Precheck rule (going forward)

Before presenting any Owner UAT workflow, verify **CORRECT_RUNTIME_PROVENANCE**:

1. Process cwd/worktree matches intended Elite worktree  
2. Branch + HEAD SHA recorded  
3. Live module path is not another worktree  
4. Hub port binds intended Integration API + BA dir  
5. HTTP 200 / SPA fallback alone is **not** sufficient  

## Competing processes (retained)

| Port | Process | Notes |
|------|---------|--------|
| `:8790` | Hub from `atlas-local-ai-operations` | **Not** UAT Hub — do not use |
| `:8792` | UAT Hub (usable-operating-layer) | **Use this** |
| `:8793` | Auth-required Hub | Preflight fail-closed |

No obsolete Elite on `:5180` after lock. Prior wrong Elite on `:5180` from `atlas-local-ai-operations` was stopped.
