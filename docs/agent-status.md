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
| tests | D25 GCC @ `8d757cf`: typecheck 0; security 6/6; npm test PASS; fixture:cvos PASS |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. OD-005 REGRESSION=PASS (D23 cite). **GCC SECURITY_CERTIFIED=PASS** @ `8d757cf`. GCC-RT-01/02/03/05/06/07 FIXED_REVALIDATED |
| Premium status | **N/A** (GCC Premium is product claim; not marked PASS by RT) |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. CANDIDATE OD-005: 0 OPEN. GCC tip P0 FIXED_REVALIDATED |
| P1 | GCC-RT-05/06/07 FIXED_REVALIDATED @ `8d757cf`. none open on this tip |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO** |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **25** |
| BASED ON WORKER SHA | `ab0e17da2005330b3ef607517a093e254acd1351` |
| BASED ON RUN ID | `run-fbfde3d2-0cbd-43ba-9b72-7b6acfa58a11` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Independent GCC revalidation @ `8d757cf` (typecheck+security+npm+fixture); D26 delta typecheck-only; SECURITY_CERTIFIED=PASS |
| REMAINING ACTIONS | Owner-gated Hub deploy still required for live P0=0; RT does not authorize production patch |
| P0/P1/P2 | Live P0=5 · Candidate OD-005 P0=0 · GCC tip FIXED_REVALIDATED · P2=none |
| TEST STATUS | GCC SECURITY_CERTIFIED=PASS @ `8d757cf`; OD-005 REGRESSION=PASS (D23 cite) |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| GCC candidate (D25 target) | `8d757cf68157a6054432de7ca57f8431731b2d64` |
| GCC D26 fix commit | `430eea4c00420d33e6541ea4ba1391c61cb47ab3` |
| Prior D24 GCC tip (superseded for gate) | `32e923cb836741a9569b58841b51ceec429f56b4` |
| OD-005 candidate (D23 cite; not retested) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- D24 @ `32e923c` and D23 OD-005 not re-run (material tip move / SHA unchanged respectively).
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T16:22:30Z
