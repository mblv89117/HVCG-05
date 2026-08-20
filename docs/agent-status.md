# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | d945e8944a2ee2ef1d091063592f4c753d1197c1 |
| baseline | Hub `940a484` / Elite `75d0c59` live freeze (not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration SoT docs pin `a29c873` / meaning `773b510` (not retested) |
| tests | D22 certified workflows on `0bbfd87`: see CERTIFIED_WORKFLOW_REGRESSION; Hub API 322/323; 1 fail convert+GET |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. Candidate P0=0 P1=0. **REGRESSION=PARTIAL**. ROLLBACK_READY=YES |
| Premium status | **N/A** |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. CANDIDATE: 0 OPEN |
| P1 | none |
| P2 | none |
| owner decisions | OD-005 deploy still owner-gated; fix convert fixture entitlement assumption before treating REGRESSION as PASS |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **22** |
| BASED ON WORKER SHA | `a7d76a95114d66f5cc338c4fbaac184dc11b5e27` |
| BASED ON RUN ID | `run-5e3f88b4-dcd3-4927-9bb2-91531596b9a9` |
| CURRENT SHA | d945e8944a2ee2ef1d091063592f4c753d1197c1 |
| COMPLETED ACTIONS | Certified frozen-workflow regression on OD-005 `0bbfd87`; rollback attestation; published CERTIFIED_WORKFLOW_REGRESSION_0bbfd87.md |
| REMAINING ACTIONS | Owner/product: update convert fixture for entitlement-correct post-convert GET; authorized Hub deploy still required for live P0=0 |
| P0/P1/P2 | Live P0=5 · Candidate P0=0 · P1=0 · P2=none |
| TEST STATUS | REGRESSION=PARTIAL (Lead→Opp post-convert GET 404); other workflows PASS; ROLLBACK_READY=YES |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live XSYS open until Hub deploy |
| OWNER DECISIONS | No deploy requested. OWNER_GATE_PREREQS: CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PARTIAL ROLLBACK_READY=YES |

## SHAs this cycle

| System | SHA |
|--------|-----|
| OD-005 candidate (regression target) | `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- D21 findings scope not re-run as sole D22 evidence.
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T15:08:30Z
