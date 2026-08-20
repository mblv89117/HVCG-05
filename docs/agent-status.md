# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | aa89cae3377a20b3065d348a61d4cf4c9f26f839 |
| baseline | Hub `940a484` / Elite `75d0c59` live freeze (not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration SoT docs pin `a29c873` / meaning `773b510` (not retested; enrichment maps to `pre-call-brief.v1` without forking) |
| tests | D27 Copilot @ `fe3db75`: npm test 44/44; security-rt 7/7; pre-call 7/7; unauth 401 + tenant probes PASS |
| build | N/A this cycle |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. **Copilot SECURITY_CERTIFIED=PASS** @ `fe3db75`. COPILOT-RT-01/02/03/11 FIXED_REVALIDATED. GCC PASS (D25 cite). OD-005 REGRESSION=PASS (D23 cite) |
| Premium status | **N/A** (Copilot Premium is product claim; not marked PASS by RT) |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. Candidate tips P0=0 FIXED_REVALIDATED |
| P1 | none open on Copilot tip |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO** |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **27** |
| BASED ON WORKER SHA | `15d9f3248d7ffb399b6ef5684ea941cf8f1b76d4` |
| BASED ON RUN ID | `run-146f77d7-4ff9-4de0-8fc5-380aa00f8031` |
| CURRENT SHA | aa89cae3377a20b3065d348a61d4cf4c9f26f839 |
| COMPLETED ACTIONS | Independent Copilot revalidation @ `fe3db75` (suites + assessments/enrichment 401 + tenant/governance probes); SECURITY_CERTIFIED=PASS |
| REMAINING ACTIONS | Owner-gated Hub deploy for live P0=0; RT does not authorize production patch |
| P0/P1/P2 | Live P0=5 · Candidate tips FIXED_REVALIDATED · P2=none |
| TEST STATUS | Copilot SECURITY_CERTIFIED=PASS @ `fe3db75`; GCC PASS (D25); OD-005 REGRESSION=PASS (D23) |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| Copilot candidate (D27 target) | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` |
| Copilot enrichment feat | `0c62792ee379e9eaa0359245cfd3a057cd1041d7` |
| Prior Copilot tip (D26) | `2f02702` (STALE_SUPERSEDED for SECURITY_CERTIFIED gate) |
| GCC (D25 cite; not retested) | `8d757cf68157a6054432de7ca57f8431731b2d64` |
| OD-005 (D23 cite; not retested) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- Identical-scope retests from D26/D25/D23 skipped by directive.
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T20:40:30Z
