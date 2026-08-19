# QA Test Matrix

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT  
**Rule:** Only list PASS if this agent ran the test or verified trustworthy written evidence.

| Workstream | Suite | Command / evidence | Result | By |
|------------|-------|--------------------|--------|-----|
| Agent Communications | Unit | `./scripts/agent-comms/run-tests.sh` (16 tests) | **PASS** | integration (ran) |
| Executive | Offline runner | `python3 tests/executive/run_offline_tests.py` | **PASS** | integration (ran) |
| Executive | Unit mirror | `python3 tests/unit/test_executive_command_center.py` | **PASS** | integration (ran) |
| Client Portal | Offline | `python3 tests/unit/test_client_portal_data_rooms.py` | **PASS** | integration (ran) |
| Operations | Offline | `python3 tests/operations/run_offline_tests.py` | **PASS** (module); merge gate still FAIL | integration (ran) |
| AI Governance | Offline | `python3 tests/ai/run_offline_tests.py` | **PASS** | integration (ran) |
| Finance | Package | `python3 tests/finance/test_finance_package.py` | **PASS** | integration (ran) |
| Finance | Unit | `python3 tests/unit/test_finance_operations.py` | **PASS** | integration (ran) |
| CRM | Offline acceptance | `deployment/reports/crm/maker-oa-acceptance-latest.json` → offlineValidation | **PASS** (evidence) | CRM agent (trusted JSON) |
| CRM | Live E2E | same JSON `liveE2E=FAILED` | **FAIL** | CRM evidence |
| CRM | Production touch | `productionTouched=false` | **PASS** (evidence) | CRM JSON |
| Full predeploy on integration branch | — | Not run (no integration merge branch yet) | **NOT RUN** | — |
| Dev smoke (Gate 6) | — | Not approved | **NOT RUN** | — |

## Skipped critical tests
None skipped without reason. Gate 6 intentionally not run.
