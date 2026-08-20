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
| contracts required | Integration tip `30964bb` reviewed (SoT publisher remains Integration train) |
| tests | D29 Integration @ `30964bb`: harness 40/40; outbound-dispatch + icp-studio fail-closed probes PASS |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. Integration schema-security **PASS** @ `30964bb` (candidate P0=0 P1=0). GTM/Copilot/GCC/OD-005 prior PASS cites unchanged |
| Premium status | **N/A** |
| integration dependencies | SoT meaning lineage unchanged; new schemas additive fail-closed |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. Integration candidate P0=0 |
| P1 | none |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO**. OD-005 not authorized |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **29** |
| BASED ON WORKER SHA | `5ed414fc07c4db7a054f2ef12474e44609d6892e` |
| BASED ON RUN ID | D28 FINISHED / followup-accepted-2026-08-20T2100Z |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Independent Integration fail-closed revalidation @ `30964bb` (outbound-dispatch.v1 + icp-studio.v1); GTM outbound adapter cite; no new findings |
| REMAINING ACTIONS | Owner-gated Hub/OD-005 deploy for live P0=0 |
| P0/P1/P2 | Live P0=5 · Integration candidate P0=0 P1=0 · P2=none |
| TEST STATUS | Integration schema-security PASS @ `30964bb`; prior product PASS cites not retested |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | Tip `30964bb` fail-closed schemas verified; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| Integration (D29 target) | `30964bbf437ef0f43708a0e308d554b84ce4c1d7` |
| Integration D8 pack | `778defd2f1bb7f80f02a58b8b9cef5bf21919c0e` |
| GTM (cite only; not retested) | `f53e628a2ef8e7eceb91e12d5a91f59a78c5bdbb` |
| Copilot / GCC / Revenue / OD-005 | prior pins; not retested |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- No new findings for outbound-dispatch.v1 / icp-studio.v1.
- No production deploy / live outbound / paid ads / Hub thaw.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T21:38:30Z
