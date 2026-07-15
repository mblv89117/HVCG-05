# PROJECT HANDOFF — Executive Command Center

## Purpose
Resume Executive Command Center (CEO module) without chat history. Packaging Option A — exclusive paths only. Ready for integration merge; Maker/BI tenant build is owner-gated and not required for pack merge.

## Module identity
- **AgentId:** `executive`
- **Branch:** `cursor/executive-command-center`
- **Worktree:** `.worktrees/executive-command-center`
- **Tip (package):** `8c3f7d8` (+ status commit for DEF-QA-004)
- **Bus:** `.agent-comms/` (official)

## Architecture (brief)
SharePoint lists SOR → exclusive `executive-views.json` → canvas `scrHomeExec` (`nfExec*`) → Power BI `HVCG_CEO_Command` → Copilot briefs. CRM stage automation owned by crm agent.

## Deliverables
See `docs/executive/HANDOFF.md`. Key roots:
- `docs/executive/`
- `src/power-apps/executive/`, `src/power-apps/formulas/ExecutiveNamedFormulas.fx`
- `src/power-bi/executive/`
- `src/sharepoint/views/executive-views.json`
- `src/power-automate/executive/` (weekly brief **Off**, not in shared `_index.json`)
- `tests/executive/`, `sample-data/executive/`

## Offline validate
```bash
cd .worktrees/executive-command-center
python3 tests/executive/run_offline_tests.py
```
Expect: `PASS executive command center module checks`.

## Parent integrator
1. Apply `docs/executive/SHARED_FILE_RECOMMENDATIONS.md` append-only (do not let module agents edit shared indexes).
2. Hold merges until master-pm opens D-003 if required.
3. Do not interrupt CRM Maker OA / smoke / auth.

## Do not
- Production
- Shared `_index.json` / `command-center-views.json` edits from this agent
- Secrets in `.agent-comms` messages
- Commit `.worktrees/`
