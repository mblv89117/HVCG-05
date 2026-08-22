# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | `c5427adcb7e5e7bab705e4a16a7b373eda7e488d` |
| baseline | D39 ENTITLED_CLASSIFY_SELF_MINTED_SESSION @ Hub `4b9631a` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D39: self-mint FAIL; ARTIFACT-REVIEW → ATLAS-01/02 VERIFIED_FIXED; LIVE_CERT=NO |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_CERT=NO**. Finding LIVE_P0=0 via artifact-review. AUTH_SESSION ABSENT. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | Finding rollup LIVE_P0=0 (ATLAS-01/02 VERIFIED_FIXED via artifact-review); LIVE_CERT withheld |
| P1 | none |
| P2 | none |
| owner decisions | No deploy. Do not replace worker. FOLLOWUP_CANNOT_REBIND=YES. |
| deployment state | Live Hub markers = `4b9631a` |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **39** |
| BASED ON WORKER SHA | `9803b8aed5d97585a38f2dbec77e693f7dab49b0` |
| PRIOR | D38 CONSUMED=38 — not redone |
| CURRENT SHA | `c5427adcb7e5e7bab705e4a16a7b373eda7e488d` |
| COMPLETED ACTIONS | D39 self-mint fail → artifact-review ATLAS-01/02 VERIFIED_FIXED; CONSUMED=39 |
| REMAINING ACTIONS | Optional: inject AZURE_* then RT self-mint entitled re-probe for LIVE_CERT path |
| LIVE_P0 | **0** (findings) |
| LIVE_CERT / LIVE_SECURITY_CERTIFIED | **NO** |
| AUTH_SESSION | **ABSENT** |
| CLASSIFICATION_PATH | **ARTIFACT_REVIEW** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| MISSION | `ENTITLED_CLASSIFY_SELF_MINTED_SESSION` |
| TEST STATUS | Lineage gate PASS; self-mint FAIL; artifact-review complete |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
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

- Not a D38 clone. Self-mint is the mission; artifact-review is the authorized fallback.
- LIVE_CERT=NO despite finding LIVE_P0=0 (no RT-held session).

**Updated:** 2026-08-22T05:07:00Z
