# QA Integration Sequence (Dry-Run)

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT  
**Policy:** Recommend only. **Do not merge** without owner D-003 via Master PM.

## Preconditions
1. DEF-QA-002 cleared (CRM dirt segregated)  
2. CRM smoke PASS **or** Master-recorded park checkpoint  
3. DEF-QA-001 cleared (Ops tip cleaned or path-filter packet)  
4. Offline suites green on each tip (re-run after tip moves)  
5. Explicit D-003 for each packet  

## Recommended order

| Step | Packet | Tip | Include | Exclude | Post-merge validation |
|------|--------|-----|---------|---------|------------------------|
| 0 | CRM park/commit | TBD | CRM-owned only | `.agent-comms` narrative if separate | acceptance JSON aligned |
| 1 | Agent Communications | `2c064b3` | `scripts/agent-comms`, `.agent-comms` scaffold, docs | CRM solution WIP | `./scripts/agent-comms/run-tests.sh` |
| 2 | Executive | `8c3f7d8` | `docs/executive`, `src/power-apps/executive`, `src/power-automate/executive`, `executive-views.json`, tests/executive | shared indexes | `tests/executive/run_offline_tests.py` |
| 3 | Client Portal | `6998a7f` | `docs/portal`, portal flows/screens/lists, templates/data-rooms, tests | shared indexes | portal offline test |
| 4 | AI Governance | `fc1fa79` | `HVCG_AI*.json`, docs/ai, tests/ai | shared indexes | `tests/ai/run_offline_tests.py` |
| 5 | Finance | `cdb5f5b` | `docs/finance`, finance apps/stubs, tests | shared indexes | finance package tests |
| 6 | Operations | `a73929d` **after DEF-QA-001** | exclusive Ops only | **must exclude 4 locked shared files** | `tests/operations/run_offline_tests.py` + ownership scan |
| 7 | Parent shared-index append | Integration-owned window | append-only per SHARED_FILE_RECOMMENDATIONS | non-Ops churn | index schema parse + uniqueness |
| 8 | CRM live delta | after smoke PASS | solution/CRM only | unrelated | live acceptance PASS |

## Expected conflicts
- Step 6 naive merge → will reintroduce locked shared deltas (DEF-QA-001)  
- Steps 2–5 should be clean if CRM parked and indexes frozen  

## Dry-run status
**HOLD** — not started. Waiting CRM park + defect clears + D-003.
