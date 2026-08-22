# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | (post-D44 commit) |
| baseline | D44 LIVE_SYNQA_CLIENT_SESSION @ Hub `101b1a7` (PR #35) |
| tests | D44: SHA_GATE PASS; steps 1–11 FAIL (AUTH absent) |
| security status | **LIVE_CERT=NO**. SYNQA entitled isolation unverified. |
| deployment state | Live Hub markers = `101b1a7` |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **44** |
| PRIOR | D42 CONSUMED=42 — not redone |
| SHA_GATE | **PASS** |
| D44_OVERALL | **FAIL** (0/11 entitled steps executed) |
| CLIENT_A_VS_CLIENT_B | **INCONCLUSIVE** |
| LIVE_P0_CONFIRMED_OPEN | **0** |
| AUTH_STAFF | **ABSENT** |
| MISSION | `LIVE_SYNQA_CLIENT_SESSION_ISOLATION` |

## THIS-POD (names only)

| Field | Value |
|-------|-------|
| envVersion | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| buildId | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |

**Updated:** 2026-08-22T10:30:00Z
