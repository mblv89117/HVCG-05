# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) / independent-validation |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | D36 CLASSIFY_ATLAS03_PUBLIC_ABSENCE @ Hub `64b56dc` |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | none this cycle |
| tests | D36: ATLAS-03 VERIFIED_FIXED via public Plaid absence; XSYS unchanged; ATLAS-01/02 untouched |
| build | N/A |
| synthetic certification | N/A |
| security status | **LIVE_SECURITY_CERTIFIED=NO**. ATLAS-03 VERIFIED_FIXED. ATLAS-01/02 STILL_INCONCLUSIVE. LIVE_P0=2. |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged |
| P0 | LIVE_P0=2 (ATLAS-01/02); ATLAS-03 VERIFIED_FIXED; XSYS-01/02 VERIFIED_FIXED (D34) |
| P1 | none |
| P2 | none |
| owner decisions | No deploy/rollback. Elite untouched. |
| deployment state | Public marker Hub `64b56dc` corroborated |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **36** |
| BASED ON WORKER SHA | `435824f1df84ddc02f362460a7c53356fbc91e0f` |
| PREVIOUS | D34 CONSUMED=34 XSYS VERIFIED_FIXED — not replayed; D35 skipped |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | D36 ATLAS-03 public-absence VERIFIED_FIXED; CONSUMED=36 |
| REMAINING ACTIONS | Staff/synthetic session for ATLAS-01/02 only |
| LIVE_P0 | **2** |
| LIVE_P1 | none |
| LIVE_SECURITY_CERTIFIED | **NO** |
| LIVE_VALIDATION_ABORTED | **NO** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |
| MISSION_HASH | `CLASSIFY_ATLAS03_PUBLIC_ABSENCE` |
| TEST STATUS | `/api/plaid/*` 405/404; `/health` no Plaid key |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Not retested |
| OWNER DECISIONS | No RT deploy/rollback |

## THIS-POD INHERIT (D36 — names only)

| Field | Value |
|-------|-------|
| THIS_POD_ENV_ID | `9e385f28-9c25-11f1-ba66-0e7d0216e441` |
| THIS_POD_ENV_VERSION | `a86e2323-9c2a-11f1-ba66-0e7d0216e441` |
| THIS_POD_BUILD_ID | `bld-20260820-859ee60c-1350-4ede-89ab-db0836afc9d5` |
| AZURE_* | all **ABSENT** |
| INHERIT | **FAIL** |
| FOLLOWUP_CANNOT_REBIND | **YES** |

## Notes

- D36 is not a D34/D35/D33/D32 clone.
- LIVE_SECURITY_CERTIFIED is worker evidence rollup only; V3 does not self-certify.
- No secret values recorded.

**Updated:** 2026-08-22T03:39:00Z
