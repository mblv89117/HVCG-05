# Next Session — Executive Command Center

**Generated:** 2026-07-15 (~15:41 PT)  
**Mode:** READY FOR INTEGRATION — offline PASS; merges held by master-pm

## Do next
1. Integration: review validation packet on bus (thread `89258011…`); merge exclusive ECC paths when master-pm releases.
2. Parent: append-only shared recommendations from `docs/executive/SHARED_FILE_RECOMMENDATIONS.md`.
3. Owner (later): Maker wire `scrHomeExec` + Power BI per `docs/executive/OWNER_ACTION_GUIDE.md`.

## Do not
- Interrupt CRM Maker OA / smoke / auth
- Edit locked shared indexes
- Production
- Enable executive weekly brief without owner approval (stays Off)

## Offline re-check
```bash
export HVCG_REPO_ROOT="/Volumes/MacMiniPro2TB/HVCG Project Management System"
cd "$HVCG_REPO_ROOT/.worktrees/executive-command-center"
python3 tests/executive/run_offline_tests.py
./scripts/agent-comms/heartbeat.sh --agent-id executive --status READY
./scripts/agent-comms/read-inbox.sh --agent-id executive
```
