# QA Evidence Index

**Owner:** integration  
**As of:** 2026-07-15 15:38 PT

| Evidence | Path / command | Supports |
|----------|----------------|----------|
| Agent registry | `.agent-comms/registry.json` | Authority + heartbeats |
| Comms tests | `./scripts/agent-comms/run-tests.sh` → 16 OK | Gate 4 agent-comms |
| CRM acceptance | `deployment/reports/crm/maker-oa-acceptance-latest.json` | Live FAIL / Prod untouched |
| CRM segregation note | `deployment/reports/crm/DIRTY_TREE_SEGREGATION.md` | DEF-QA-002 |
| Exec offline | `.worktrees/executive-command-center/tests/executive/run_offline_tests.py` | PASS |
| Portal offline | `.worktrees/client-portal-data-rooms/tests/unit/test_client_portal_data_rooms.py` | PASS |
| Ops offline | `.worktrees/operations-hub/tests/operations/run_offline_tests.py` | PASS |
| AI offline | `.worktrees/ai-governance-work-queues/tests/ai/run_offline_tests.py` | PASS |
| Finance offline | `.worktrees/finance-operations/tests/finance/test_finance_package.py` | PASS |
| Ops shared delta | `git diff --stat b75b19b...a73929d -- <locked files>` | DEF-QA-001 |
| Bus conflict | message `51f47dc4` | CF-001 |
| Integration authority HANDOFF | message `29c8f1b5-...` | Registration |
| This dashboard pack | `QA_*.md`, `RELEASE_*.md`, `CHANGELOG_DRAFT.md` on `cursor/qa-release-manager` | Audit trail |
