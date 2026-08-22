# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D38 ENTITLED_ATLAS0102_CLASSIFY @ Hub `4b9631a` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D38: lineage PASS; unauth 401; AUTH_SESSION missing → ATLAS-01/02 STILL_INCONCLUSIVE; ATLAS-03/XSYS still VERIFIED_FIXED |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERT=NO**. LIVE_P0=2 (ATLAS-01/02). ATLAS-03 + XSYS VERIFIED_FIXED. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=2 (ATLAS-01/02 STILL_INCONCLUSIVE); not 0 |
| P1 | none |
| P2 | none |
| owner decisions | No deploy. Azure SP requested for future AUTH_SESSION. Elite untouched. |
| deployment state | Live Hub markers = `4b9631a` |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **38** |
| BASED ON WORKER SHA | `4b819e6b033c10418e7b0018063f9f2730d4bc27` |
| D37 | CONSUMED=37 — not re-executed |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D38 lineage+unauth+classify ATLAS-01/02 STILL_INCONCLUSIVE; CONSUMED=38 |
| REMAINING ACTIONS | Hub AUTH_SESSION then entitled SYN01 ATLAS-01/02 probes |
| LIVE_P0 | **2** |
| LIVE_P1 | none |
| LIVE_CERT / LIVE_SECURITY_CERTIFIED | **NO** |
| AUTH_SESSION | **MISSING** |
| LINEAGE | **PASS** (`4b9631a`) |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| MISSION | `ENTITLED_ATLAS0102_CLASSIFY` |
| TEST STATUS | Lineage+unauth PASS; entitled probes blocked |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback |

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |
| AUTH_SESSION | **ABSENT** |
| INHERIT | **FAIL** |

## Live release

| System | Evidence |
|--------|----------|
| Live Hub SHA (RT) | `4b9631a0a50e06591dd9100fb48b07e5aea7d008` |
| hub-build.branch | `cursor/hub-entitlement-group-members-7a6b` |
| OneDeploy (claim cite) | `7e3f65a2-948b-4f7d-959b-dd47576170b2` |
| Elite | not touched (`75d0c59`) |

## Notes

- Not a D37 clone. V3 SYN01 session claims are not RT VERIFIED_FIXED.
- No secrets logged. LIVE_CERT=NO; live P0≠0.

**Updated:** 2026-08-22T04:56:00Z
