# Sprint EOS-2 — Planning Only (NOT STARTED)

**Track:** 9 — Engineering Operating System
**Status:** PLANNING ONLY — NOT ASSIGNED / NOT STARTED
**Depends on:** Separate owner authorization after EOS Sprint 1 commit/push

## Recommended objective

Retire the five accepted Sprint 1 QA findings before adding broader EOS
automation.

## Accepted Sprint 1 debt

- DEF-EOS-001 — workflow gate enforcement
- DEF-EOS-002 — KPI source duplication
- DEF-EOS-003 — UI output escaping
- DEF-EOS-004 — live snapshot collection
- DEF-EOS-005 — Agent Bus 2.0 persistence/bridge

## Candidate themes

1. Resolve and test DEF-EOS-001 through DEF-EOS-005
2. Add live snapshot collector from `git worktree list` + registry + Atlas
3. Persist Change Requests and Bus 2.0 messages to disk under EOS store
4. Bridge Bus 2.0 fields onto agent-comms send CLI (additive)
5. Add technical debt board with Atlas TD IDs
6. Add release candidate checklist automation

## Non-goals until authorized

Merge · Deploy · Production · Track 1 · Revenue mutation
