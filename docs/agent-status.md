# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | (post-D42 commit) |
| baseline | D42 LIVE_CLIENT_CX_CK_ISOLATION @ Hub `976bea59` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D42: SHA_GATE PASS; scope2 PASS; scopes3-6 NOT_EXECUTED |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERT=NO**. Client unsigned P0=0; entitled isolation INCONCLUSIVE. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0_CONFIRMED_OPEN=0; entitled client isolation unverified |
| P1 | none |
| P2 | none |
| owner decisions | No deploy. Do not replace worker. |
| deployment state | Live Hub markers = `976bea59` |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **42** |
| PRIOR | D41 CONSUMED=41 — not redone |
| COMPLETED ACTIONS | D42 SHA_GATE PASS; unsigned /client isolation PASS; entitled probes blocked |
| REMAINING ACTIONS | Inject AZURE_* → self-mint SYN01 session → re-run scopes 3–6 |
| SHA_GATE | **PASS** |
| CLIENT_ISOLATION | **INCONCLUSIVE** |
| LIVE_P0_CONFIRMED_OPEN | **0** |
| LIVE_CERT | **NO** |
| AUTH_SESSION | **ABSENT** |
| MISSION | `LIVE_CLIENT_CX_CK_ISOLATION` |
| OWNER DECISIONS | No RT deploy; worker not recreated |

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |
| AUTH_SESSION | **ABSENT** |

**Updated:** 2026-08-22T07:22:00Z
