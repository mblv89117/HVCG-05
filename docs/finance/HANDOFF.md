# HANDOFF — Finance Operations

**Agent:** `finance`  
**Branch:** `cursor/finance-operations`  
**Worktree:** `.worktrees/finance-operations`  
**Packaging:** Option A — exclusive docs + offline tests  
**Status:** **IN PROGRESS** (package authored; Maker / live apply deferred)

## Deliverables

| Deliverable | Path |
|-------------|------|
| Architecture | `docs/finance/ARCHITECTURE.md` |
| Requirements | `docs/finance/REQUIREMENTS.md` |
| Data map | `docs/finance/DATA_MAP.md` |
| Shared merge recommendations | `docs/finance/SHARED_FILE_RECOMMENDATIONS.md` |
| Owner gates (later) | `docs/finance/OWNER_ACTION_GUIDE.md` |
| Module status | `PROJECT_STATUS.md` (Finance) |
| Resume cue | `NEXT_SESSION.md` |
| Offline smoke | `tests/unit/test_finance_operations.py`, `tests/finance/test_finance_package.py` |

## Offline validation

```bash
cd ".worktrees/finance-operations"
python3 tests/unit/test_finance_operations.py
# or: python3 tests/finance/test_finance_package.py
```

Expected: `PASS finance operations package checks`.

## Intentionally not touched

- `deployment/**` engines  
- Authentication / environment secrets  
- CRM flows and active Maker OA packages  
- Locked shared indexes (`flows/_index.json`, `definitions/_index.json`, `lists/_index.json`, `command-center-views.json`, `NamedFormulas.fx`)  
- Existing Finance list schema bodies (documented only)  
- Production  

## Parent integrator next steps

1. Merge this branch after offline PASS and Master PM go-ahead.  
2. Apply append-only items in `SHARED_FILE_RECOMMENDATIONS.md` (predeploy test hook first).  
3. Owner Maker: build `scrFinance` + gate flows Off (see `OWNER_ACTION_GUIDE.md`).  
4. Live Dev smoke with demo amounts only — then refresh status to READY FOR INTEGRATION / ACCEPTANCE.

## Resume cue

Next finance session: optional exclusive `src/power-apps/finance/` build sheet + `finance-views.json` stubs **without** editing locked indexes; keep CRM Maker OA uninterrupted.
