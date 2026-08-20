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
| contracts required | Integration SoT meaning `773b510` (adapters cite `516553f`; not forked) |
| tests | D28 GTM @ `f53e628`: journey-sot 5/5; gtm-agent 16/16; flags 9/9; adapter probe PASS |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. **GTM SECURITY_CERTIFIED=PASS** @ `f53e628` (candidate P0=0 P1=0). Copilot PASS (D27 cite). GCC PASS (D25 cite). OD-005 REGRESSION=PASS (D23 cite) |
| Premium status | **N/A** |
| integration dependencies | SoT meaning unchanged vs `773b510` |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. GTM candidate P0=0 |
| P1 | none open on GTM tip |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO**. OD-005 not authorized |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **28** |
| BASED ON WORKER SHA | `9220be8589b28b9462ded1df78109cc54714eeaf` |
| BASED ON RUN ID | `run-146f77d7-4ff9-4de0-8fc5-380aa00f8031` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Independent GTM revalidation @ `f53e628` (journey-sot adapters, flag defaults, suites); SECURITY_CERTIFIED=PASS |
| REMAINING ACTIONS | Owner-gated Hub deploy for live P0=0; RT does not authorize production patch |
| P0/P1/P2 | Live P0=5 · GTM candidate P0=0 P1=0 · P2=none |
| TEST STATUS | GTM SECURITY_CERTIFIED=PASS @ `f53e628`; Copilot/GCC/OD-005 cited from prior directives |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| GTM candidate (D28 target) | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` |
| GTM journey-sot feat | `f61d29c3f5b12398871a58d5cfa25b38f97434f1` |
| Prior GTM tip (nurture-only) | `14d8e4d` (STALE_SUPERSEDED for this gate) |
| Copilot (D27 cite; not retested) | `fe3db7569a0c52e6d25c171c57bba1d85d0fa592` |
| GCC (D25 cite; not retested) | `8d757cf68157a6054432de7ca57f8431731b2d64` |
| OD-005 (D23 cite; not retested) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- Identical-scope retests skipped per directive.
- No production deploy / live outbound / paid ads.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T21:06:30Z
