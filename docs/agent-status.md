# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | `c438d08c2514fb6b6b8d9b42d40c1514f43e636f` |
| baseline | D41 LIVE_CLIENT_PORTAL_ISOLATION @ Hub target `e63279a8` (live drifted `b707049c`) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D41: probe1 PASS; probe5 NOT_LIVE; probes2-4 NOT_EXECUTED; D41 **FAIL** |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERT=NO**. Portal surface unsigned P0=0; entitled isolation unverified. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | Portal surface LIVE_P0_CONFIRMED_OPEN=0; entitled portal isolation unverified |
| P1 | none |
| P2 | none |
| owner decisions | No deploy. Do not replace worker. FOLLOWUP_CANNOT_REBIND=YES. |
| deployment state | Live Hub markers = `b707049c` (directive cited `e63279a8`) |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **41** |
| PRIOR | D39 CONSUMED=39 — not redone |
| COMPLETED ACTIONS | D41 unsigned fail-closed PASS; lineage drift; entitled probes blocked |
| REMAINING ACTIONS | Inject AZURE_* → self-mint SYN01 session → re-run D41 probes 2–4 on pinned SHA |
| D41_VERDICT | **FAIL** |
| LIVE_P0 (portal surface, confirmed open) | **0** |
| LIVE_P0 (entitled portal, unverified) | **YES** |
| LIVE_CERT / LIVE_SECURITY_CERTIFIED | **NO** |
| AUTH_SESSION | **ABSENT** |
| MISSION | `LIVE_CLIENT_PORTAL_ISOLATION` |
| TEST STATUS | Probe1 PASS (all 401); probe5 NOT_LIVE (405); probes2-4 NOT_EXECUTED |
| OWNER DECISIONS | No RT deploy; worker not replaced |

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` (= approved) |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |
| AUTH_SESSION | **ABSENT** |
| INHERIT | **FAIL** |

## Notes

- D41 is not a D39 clone. Entitled portal isolation requires self-minted AUTH_SESSION.
- `/client` 405 recorded NOT_LIVE — does not fail Hub SHA per D41 rule 5.
- BUSINESS_USEFUL PASS not claimed.

**Updated:** 2026-08-22T07:10:00Z
