# STOP — Operations Hub Sprint 1 Atlas remediation

**From:** Master PM (integration coordinator)
**To:** `operations` agent
**Issued:** 2026-07-16T21:10:00Z
**Severity:** BLOCKING before commit/push

## Violation

`.worktrees/operations-hub-sprint1` currently modifies Master PM–locked Atlas roots and out-of-scope sprint docs:

- `PROJECT_ATLAS/CURRENT_STATE.md` (locked)
- `PROJECT_ATLAS/NEXT_ACTIONS.md` (locked)
- `PROJECT_ATLAS/ROADMAP.md` (locked)
- `PROJECT_ATLAS/Tracks/Track7_InternalOperations.md` (Master PM reconciles)
- `PROJECT_ATLAS/Sprints/Sprint_FinanceOperations1.md` (Finance ownership — remove from Ops WT)

## Required remediation (Ops only)

1. Discard or revert edits to locked Atlas roots and Track7 in the Ops worktree.
2. Delete `Sprint_FinanceOperations1.md` from the Ops worktree (Finance owns that sprint file).
3. Put all shared-Atlas status claims into this proposed update file path only:
   `PROJECT_ATLAS/Handoffs/proposed/OperationsHubSprint1_ATLAS_UPDATE.md`
4. Keep exclusive paths only:
   - `apps/hvcg-operations-hub/**`
   - `docs/operations-sprint1/**`
   - `PROJECT_ATLAS/Sprints/Sprint_OperationsHub1.md`
   - `PROJECT_ATLAS/Architecture/OperationsHubSprint1.md`
   - `PROJECT_ATLAS/QA/OperationsHubSprint1/**`
   - `PROJECT_ATLAS/Handoffs/OperationsHubSprint1.md`
   - screenshots / QA evidence under Ops Sprint 1 namespaces
5. **Do not commit or push** until separate owner approval is recorded.

Master PM will reconcile shared Atlas after a clean Ops handoff + proposed update file.
