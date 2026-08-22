# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D37 INDEPENDENT_LIVE_VALIDATION_1ac6257 |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D37: SHA_GATE PASS on 1ac6257; fail-closed 401; directoryObjects CONFIRMED; ATLAS-03 VERIFIED_FIXED; ATLAS-01/02 STILL_INCONCLUSIVE |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERTIFIED=NO**. LIVE_P0=2 (ATLAS-01/02). ATLAS-03 + XSYS VERIFIED_FIXED. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=2 (ATLAS-01/02 STILL_INCONCLUSIVE); not 0 |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback. SYN01 owner-gated. Elite untouched. |
| deployment state | Live Hub public markers = `1ac6257` |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **37** |
| BASED ON WORKER SHA | `635772cf57cb02170e7f6b8c9e99cc4d8d0cf81f` |
| PRIOR | D36 CONSUMED — not cloned as mission |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D37 independent live validation of `1ac6257`; CONSUMED=37; stop for V3 |
| REMAINING ACTIONS | Owner-gated SYN01 / staff session for ATLAS-01/02 only |
| LIVE_P0 | **2** |
| LIVE_P1 | none |
| LIVE_CERTIFIED | **NO** |
| LIVE_SECURITY_CERTIFIED | **NO** |
| SHA_GATE | **PASS** (`1ac6257`) |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| MISSION | `INDEPENDENT_LIVE_VALIDATION_1ac6257` |
| TEST STATUS | Markers+health+fail-closed+directoryObjects+plaid+XSYS-unauth complete; ATLAS-01/02 not entitled-probed |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy; no D38 from RT |

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |
| INHERIT | **FAIL** |

## Live release

| System | Evidence |
|--------|----------|
| Live Hub SHA (RT re-GET) | `1ac62572e2f0d4206f78539c25041fb7f69430f8` |
| hub-build.branch | `cursor/hub-directory-objects-entitle-7a6b` |
| OneDeploy (claim cite) | `333912dc-e3e1-48e7-aefa-946142e6185f` |
| Elite | not touched |

## Notes

- Not a D36/D35/D34/D33/D32 clone.
- Do not claim LIVE_CERTIFIED or live P0=0.
- Stop — V3 consumes next.

**Updated:** 2026-08-22T04:10:00Z
