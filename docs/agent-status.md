# Agent Status — Platform Red Team

| Field | Value |
|-------|-------|
| project | Platform Red Team (Train F) |
| primary repo | `hvcg-05` |
| branch | `cursor/platform-red-team-866c` |
| current SHA | *(git tip after push)* |
| baseline | Hub `940a484` / Elite `75d0c59` PASS freeze (live not mutated) |
| owned domains | Independent adversarial testing and findings |
| files/domains touched | `docs/red-team/**`, `docs/agent-status.md`, `scripts/red-team/check-d21-od005-complete.mjs` |
| contracts required | Integration SoT `773b510` (not retested) |
| tests | D21: website-leads 9/9 · Plaid 6/6 · staff bypass cand 0 / hub 2 · D21 harness exit 0 |
| build | N/A |
| synthetic certification | N/A |
| security status | **Live Hub gate FAIL** (P0=5). **Candidate `0bbfd87` P0=0 P1=0** (FIXED_REVALIDATED; not deployed) |
| Premium status | **N/A** |
| integration dependencies | `integration@773b510` |
| P0 | **LIVE:** ATLAS-01/02/03 + XSYS-01/02 OPEN @ Hub `940a484`. **CANDIDATE:** all five FIXED_REVALIDATED @ `0bbfd87` |
| P1 | none |
| P2 | none |
| owner decisions | OD-005 deploy authorization required to clear live P0s; do not treat candidate closes as live |
| deployment state | REMOTE_REACHABLE — **not** DEPLOYMENT_READY (live P0≠0) |

## Orchestrator control

| Field | Value |
|-------|-------|
| LAST ORCHESTRATOR DIRECTIVE VERSION CONSUMED | **21** |
| BASED ON WORKER SHA | `8d336b2c4d02cb61044702aa9b91098fc409eab5` |
| BASED ON RUN ID | `run-38c049ca-7a16-44ee-a200-7faa55e9a2d6` |
| CURRENT SHA | *(git tip after push)* |
| COMPLETED ACTIONS | Independently revalidated complete OD-005 @ `0bbfd87` (supersedes `bb7edae`); dual-surface statuses for ATLAS-01/02/03 + XSYS-01/02; website-leads 9/9 + Plaid 6/6 re-run |
| REMAINING ACTIONS | Live retest after authorized Hub/Elite OD-005 deploy only |
| P0/P1/P2 | Live P0=5 · Candidate P0=0 · P1=0 · P2=none |
| TEST STATUS | website-leads 9/9 PASS; Plaid 6/6 PASS; D21 harness exit 0 |
| PREMIUM STATUS | N/A |
| INTEGRATION STATUS | SoT `773b510`; live XSYS authenticity open until Hub deploy |
| OWNER DECISIONS | Await OD-005 production security-patch authorization — **no deploy requested this run** |

## SHAs this cycle

| System | SHA |
|--------|-----|
| OD-005 complete candidate | `0bbfd877aac88b654a7c9abdf6c63a312d7cfb05` |
| Live Hub (still OPEN for P0s) | `940a4849577ad5356da86850e2eccdbf3fe4e86b` |

## Notes

- Candidate P0=0 and P1=0 on `0bbfd87` — stated for orchestrator; **no deploy request**.
- Live production P0 count remains **5** until Hub is actually patched.
- Incomplete tip `bb7edae` is STALE_SUPERSEDED for XSYS completeness.

**Updated:** 2026-08-20T14:55:30Z
