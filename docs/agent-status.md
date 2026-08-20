# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | 1242d445c81c57ff5f403ed1bc53db8eae4d1c60 |
| baseline | Hub `940a484` / Elite `75d0c59` live freeze (not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md` |
| contracts required | Integration SoT docs pin `a29c873` / meaning `773b510` (not retested) |
| tests | D24 GCC @ `32e923c`: security 6/6; npm test PASS; fixture:cvos PASS; typecheck FAIL |
| build | N/A |
| synthetic certification | N/A |
| security status | Live Hub P0=5 OPEN. OD-005 REGRESSION=PASS (D23 cite). GCC SECURITY_CERTIFIED=**PARTIAL** (typecheck). GCC-RT-01/02/03/05/06/07 FIXED_REVALIDATED @ `32e923c` |
| Premium status | **N/A** (GCC Premium is product claim; not marked PASS by RT) |
| integration dependencies | `integration@a29c873` (docs; meaning unchanged vs `773b510`) |
| P0 | LIVE: ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. CANDIDATE OD-005: 0 OPEN. GCC P0s FIXED_REVALIDATED on tip |
| P1 | GCC-RT-05/06/07 FIXED_REVALIDATED @ `32e923c`. none open on this tip |
| P2 | none |
| owner decisions | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH = **NO**. GCC typecheck residual owned by product tip |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **24** |
| BASED ON WORKER SHA | `eb77e53a3e5636740fb11f11d8f0aee72fe3ff44` |
| BASED ON RUN ID | `run-f4eea81d-e7b1-405f-9913-56905040c2fe` |
| CURRENT SHA | 1242d445c81c57ff5f403ed1bc53db8eae4d1c60 |
| COMPLETED ACTIONS | Independent GCC revalidation @ `32e923c` (security/full/fixture/typecheck); published REVALIDATION_DIRECTIVE_24; GCC-RT FIXED_REVALIDATED |
| REMAINING ACTIONS | Product: fix `fixture-synthetic-cvos-path.ts` typecheck so SECURITY_CERTIFIED can go PASS; owner-gated Hub deploy for live P0=0 |
| P0/P1/P2 | Live P0=5 · Candidate OD-005 P0=0 · GCC tip P0/P1 FIXED_REVALIDATED · P2=none |
| TEST STATUS | GCC security+npm+fixture PASS; typecheck FAIL → SECURITY_CERTIFIED=PARTIAL. OD-005 REGRESSION=PASS (D23 cite) |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT meaning `773b510`; live Hub XSYS open until deploy |
| OWNER DECISIONS | No deploy. AUTHORIZE PRODUCTION SECURITY PATCH=NO |

## SHAs this cycle

| System | SHA |
|--------|-----|
| GCC candidate (D24 target) | `32e923cb836741a9569b58841b51ceec429f56b4` |
| OD-005 candidate (D23 cite; not retested) | `9e5d10a20639bbeb659fbacd6362cd9f13adb08b` |
| Live Hub | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- D23 OD-005 residual suite not re-run (SHA unchanged).
- No production deploy / rollback execution.
- Live production P0 count remains **5**.

**Updated:** 2026-08-20T15:53:00Z
