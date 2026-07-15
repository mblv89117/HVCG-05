# Next Session — Finance Operations

**Generated:** 2026-07-15 (~15:35 PT)  
**Mode:** Finance Ops package **IN PROGRESS** — exclusive docs + offline smoke done; Maker/live deferred

## Current project status

- **Module:** Finance Operations  
- **Branch / worktree:** `cursor/finance-operations` / `.worktrees/finance-operations`  
- **Package:** `docs/finance/` (Architecture, Requirements, Data Map, Shared recommendations, Handoff, Owner guide)  
- **Lists:** Existing Finance domain schemas documented; no new exclusive list stubs this sprint  
- **Bus:** register + heartbeat `IN_PROGRESS`; ack Master PM messages from MAIN `HVCG_REPO_ROOT`

## Do next

1. Re-run offline: `python3 tests/unit/test_finance_operations.py` (expect PASS).  
2. If Master PM asks for READY: add exclusive `src/power-apps/finance/` build sheet and/or `src/sharepoint/views/finance-views.json` **without** editing locked indexes; update HANDOFF.  
3. On parent merge request: hand integration `SHARED_FILE_RECOMMENDATIONS.md` only.  
4. Owner Maker (later): OA-FIN-01…05 — `scrFinance`, flows Off, demo smoke.

## Do not

- Interrupt CRM Maker OA / pac auth / smoke on MAIN  
- Edit locked shared indexes or deployment engines  
- Touch Production  
- Commit secrets / `.env` / live client invoice amounts into the repo or bus  
- Merge or push unless Master PM / owner explicitly asks
