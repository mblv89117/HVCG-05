# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | b56c4a29ba2f9af8a7ee1ac6e59a1e60116c9155 |
| baseline | Hub `940a484` / Elite `75d0c59` live freeze (not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration SoT docs pin `a29c873` / meaning `773b510` (not retested) |
| tests | D26 Copilot @ `2f02702`: npm test 37/37; security-rt 7/7; build 0; jose fail-closed PASS |
| build | Copilot `npm run build` exit 0 @ `2f02702` |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. OD-005 REGRESSION=PASS (D23). GCC SECURITY_CERTIFIED=PASS (D25 cite). **Copilot SECURITY_CERTIFIED=PASS** @ `2f02702`. COPILOT-RT-01/02/03/11 FIXED_REVALIDATED |
| Premium status | **N/A** (Copilot Premium is product claim; not marked PASS by RT) |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. Candidates: OD-005/GCC/Copilot tip P0=0 FIXED_REVALIDATED |
| P1 | none open on Copilot tip (RT-01/11 FIXED_REVALIDATED) |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO** |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **26** |
| BASED ON WORKER SHA | `b0dfd71d9f972203bda51f556ab61f631c5d8481` |
| BASED ON RUN ID | `run-b434439c-dff0-43d5-91c9-8f47083d4737` |
| CURRENT SHA | b56c4a29ba2f9af8a7ee1ac6e59a1e60116c9155 |
| COMPLETED ACTIONS | Independent Copilot revalidation @ `2f02702` (npm test/security/build/jose inspect); SECURITY_CERTIFIED=PASS |
| REMAINING ACTIONS | Owner-gated Hub deploy for live P0=0; RT does not authorize production patch |
| P0/P1/P2 | Live P0=5 · Candidate OD-005/GCC/Copilot tip FIXED_REVALIDATED · P2=none |
| TEST STATUS | Copilot SECURITY_CERTIFIED=PASS @ `2f02702`; GCC PASS (D25 cite); OD-005 REGRESSION=PASS (D23 cite) |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| Copilot candidate (D26 target) | `2f0270228cdaf1dceed51a52a62200ffde07a9e0` |
| Copilot jose middleware fix | `600403b4d12629faf434f95d33cd864222d4247d` |
| Prior Copilot tip (D12) | `19a200e` (superseded for SECURITY_CERTIFIED gate) |
| GCC (D25 cite; not retested) | `8d757cf68157a6054432de7ca57f8431731b2d64` |
| OD-005 (D23 cite; not retested) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- GCC `8d757cf` and OD-005 `9e5d10a` not re-run this cycle.
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T16:26:30Z
