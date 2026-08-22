# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D32 EXECUTE — HOLD LIFTED; Step 0 inherit on this pod |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D32 Step 0 INHERIT=FAIL — LIVE_VALIDATION_ABORTED=YES; no finding probes |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_SECURITY_CERTIFIED=NO**. INHERIT=FAIL. LIVE_VALIDATION_ABORTED=YES. LIVE_P0=5 INCONCLUSIVE. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=5 (INCONCLUSIVE×5) |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback from RT. Await AZURE_* on this pod for inherit PASS. |
| deployment state | Exact release unverified (stopped at inherit) |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **32** |
| BASED ON WORKER SHA | `36499af43f92d4e3a4069cff8015f53ce07d1437` |
| BASED ON PRIOR RUN | D31 FINISHED ABORT — `run-c2b4071e-da35-4ee5-a8dd-3152997cb20f` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D32 acknowledge; THIS-pod inherit recorded; INHERIT=FAIL abort; CONSUMED=32 published |
| REMAINING ACTIONS | Inject AZURE_* → inherit PASS → SHA gate → five finding reproducers |
| LIVE_P0 | **5** |
| LIVE_P1 | none |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **YES** |
| INHERIT | **FAIL** |
| TEST STATUS | Finding/regression probes not run (Step 0) |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback. Elite untouched. |

## THIS-POD INHERIT (D32 Step 0 — names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_CLIENT_ID | **ABSENT** |
| AZURE_CLIENT_SECRET | **ABSENT** |
| AZURE_TENANT_ID | **ABSENT** |
| AZURE_SUBSCRIPTION_ID | **ABSENT** |
| az CLI | present |
| INHERIT | **FAIL** |

## SHAs this cycle

| System | SHA / evidence |
|--------|----------------|
| Required live Hub package | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` (**unverified** — inherit FAIL) |
| Required controlled deployment ID | `698f7e92-40d1-44e6-82ce-3988d30144fc` (**unverified**) |
| Live Hub URL | `https://app-atlas-integration-hub.azurewebsites.net` |
| Elite (do not touch) | `75d0c59` |

## Notes

- D31 abort not overridden. D32 stopped at Step 0 inherit FAIL.
- No app-settings or Key Vault reads. No finding probes under inherit FAIL.
- Azure SP secrets re-requested for this durable worker environment.

**Updated:** 2026-08-22T02:08:00Z
