# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | Hub `940a484` / Elite `75d0c59` live freeze (not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration SoT docs pin `a29c873` / meaning `773b510` (not retested) |
| tests | D23 residual on `9e5d10a`: sharepoint 34/34; Hub API 323/323; staff-bypass exit 0 |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. Candidate P0=0 P1=0. **REGRESSION=PASS**. ROLLBACK_READY=YES |
| Premium status | **N/A** |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. CANDIDATE: 0 OPEN |
| P1 | none |
| P2 | none |
| owner decisions | OD-005 deploy still owner-gated. AUTHORIZE PRODUCTION SECURITY PATCH = **NO** from this worker |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **23** |
| BASED ON WORKER SHA | `b483d35a1297d2bc4cba4a6c674b8f7096d62a36` |
| BASED ON RUN ID | `run-bc49d9ec-cc34-45f9-a245-6d911d58276a` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Independent convert residual + Hub API + staff-bypass retest on OD-005 `9e5d10a`; rollback re-attest; CERTIFIED_WORKFLOW_REGRESSION_9e5d10a.md |
| REMAINING ACTIONS | Owner gate / authorized Hub deploy still required for live P0=0; RT does not authorize production patch |
| P0/P1/P2 | Live P0=5 · Candidate P0=0 · P1=0 · P2=none |
| TEST STATUS | REGRESSION=PASS @ `9e5d10a`; ROLLBACK_READY=YES |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live XSYS open until Hub deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO. OWNER_GATE_PREREQS: CANDIDATE_P0=0 CANDIDATE_P1=0 RED_TEAM=PASS REGRESSION=PASS ROLLBACK_READY=YES |

## SHAs this cycle

| System | SHA |
|--------|-----|
| OD-005 candidate (regression target) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Prior D22 residual SHA (superseded for regression) | `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- D21 findings scope not re-run as sole D23 evidence; candidate FIXED_REVALIDATED retained (D23 commands did not reopen).
- D22 full suite not re-run against `0bbfd87`.
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T15:37:30Z
