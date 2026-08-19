# Environment verification

| Item | Expected | Actual (2026-07-20) |
|------|----------|---------------------|
| SWA Dev hostname | zealous-rock-0090c7e1e.7.azurestaticapps.net | **PASS** reachable |
| Title | Atlas Elite OS — Development / UAT | **PASS** |
| Env banner | No live client actions | **PASS** |
| HSTS / nosniff / SAMEORIGIN | Present | **PASS** |
| Staging SWA | Planned | **N/A** — not configured |
| Production SWA | Owner-gated | **N/A** — not deployed |
| Dataverse Dev | org1131a2b0 | Linked from Admin page |
| Signed-in Dataverse KPIs | Live when MSAL OK | **NOT VERIFIED** this session (unsigned) |
| Release branch build | Green | **FAIL** TS errors |
| Deployed == branch tip | Match | **FAIL** hash mismatch + placeholders remain |
