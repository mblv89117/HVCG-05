# Next Session — Operations Hub

**Generated:** 2026-07-15 (~15:35 PT)  
**Mode:** **IN PROGRESS** — exclusive Ops Hub package; shared indexes locked forever for Ops

## Current project status

- **Module:** Operations Hub (`operations` agent)  
- **Branch / worktree:** `cursor/operations-hub` @ `.worktrees/operations-hub`  
- **Status:** IN PROGRESS  
- **CONFLICT `51f47dc4`:** closed by Master ownership redesign  
- **Docs:** `docs/operations/{ARCHITECTURE,HANDOFF,SHARED_FILE_RECOMMENDATIONS}.md`  
- **Exclusive assets:** `HVCG_Ops*` (5 flows + definitions), `operations-hub-views.json`, Ops list schema deltas (8 lists)

## Do next

1. Confirm bus: register + heartbeat `IN_PROGRESS`; unread requires-ack cleared.  
2. Exclusive-only follow-ups only (docs, screen stubs, optional offline tests under ops-owned paths).  
3. When Master schedules parent replay: Integration applies `SHARED_FILE_RECOMMENDATIONS.md` after CRM park — Ops does not touch indexes.  
4. Maker import of `HVCG_Ops*` only after separate owner OA; leave flows **Off**.

## Do not

- Edit locked shared files: `flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`  
- Interrupt CRM Maker OA / smoke / auth  
- Merge, deploy, touch Prod, or put secrets on the bus  
- Re-add Executive / CRM exclusive trees onto this branch  
- Commit `AGENT_BOOTSTRAP_PROMPT.md` / `AGENT_COMMS_ACTIVATE.md` bootstrap copies
