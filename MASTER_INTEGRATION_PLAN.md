# MASTER INTEGRATION PLAN

**Owner:** Master PM  
**As of:** 2026-07-15 15:27 PT  
**Policy:** Recommend only. No merge/deploy/Prod without explicit owner approval.

## Preconditions

1. CRM smoke PASS **or** explicitly parked clean CRM checkpoint (no mixed WIP).  
2. Bus ACKs healthy for agents being merged.  
3. Offline tests green on candidate.  
4. No dual-writers on locked files (active lock or cleared CONFLICT).  
5. Owner **D-003** for that packet.

## Safe merge order

| # | Candidate | Status now | Notes |
|---|-----------|------------|-------|
| 0 | CRM live delta | BLOCKED | Own commit after PASS |
| 1 | Agent Communications (`2c064b3` pushed) | READY FOR INTEGRATION | Canonical bus — merge when D-003; do not rebuild |
| 2 | Executive | READY FOR INTEGRATION | Apply SHARED_FILE_RECOMMENDATIONS append-only |
| 3 | Client Portal | IN PROGRESS | After handoff + offline PASS |
| 4 | AI Governance | IN PROGRESS | After WIP commit |
| 5 | Operations | IN PROGRESS | After SF-001 window |
| 6 | Finance | NOT STARTED | Last |

## Idle CRM worktrees

Leave `agent/crm-*` VALIDATED/idle until smoke complete; then retire worktrees if clean.

## Offline validation recipe

Local merge into temp integration branch → module tests → full predeploy offline → ownership scan → mark VALIDATED or return to owner agent. Never repair/import/Prod as part of offline validation.
