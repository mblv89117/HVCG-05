# PROJECT HANDOFF — AI Governance & Work Queues

## Purpose
Resume AI Governance work without chat history. This branch packages SharePoint list schema updates for human-gated AI jobs/queues. Offline validation passed; ready for integration merge. No Production.

## Architecture (brief)
- System of record: `HVCG_AIJobs` / steps / workers / prompts / tools / context / outputs / approvals / audits / escalations + specialized `HVCG_AI_*` queues.
- Principles (see `docs/ai/AI_GOVERNANCE.md`): AI drafts; humans decide; no auto external send in v1.x; client isolation; auditable jobs.

## Repo / branch
- Remote: `https://github.com/mblv89117/HVCG-05.git`
- Branch: `cursor/ai-governance-work-queues`
- Worktree: `.worktrees/ai-governance-work-queues`
- Bus root: `/Volumes/MacMiniPro2TB/HVCG Project Management System`

## Environment
- **development** packaging only (schemas in git)
- Site (future apply): `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
- Production: forbidden

## Completed components
- 19 modified `src/sharepoint/lists/HVCG_AI*.json` — governance columns (confidence threshold, retries/backoff, escalation reason/id, review deadline, external-action declarations, Copilot fields, worker kill-switch / cost budget, send blocked defaults).
- Offline checker: `tests/ai/test_ai_list_schemas.py` + `tests/ai/run_offline_tests.py` → **PASS**.
- Status docs rewritten for AI module (not CRM Maker boilerplate).

## Not in this package
- Shared `lists/_index.json` (LOCKED — parent-only appends via SHARED_FILE_RECOMMENDATIONS if needed).
- Deployment engines / CRM flows / Maker OA.
- Live list provision.

## Exact next steps
1. Integration consumes this branch after Master PM D-003.
2. Parent applies Dev SharePoint schema when approved (do not run repair from this agent unless instructed).
3. Later: exclusive AI flow/app packages under `src/power-automate/ai/`, `src/power-apps/ai/`.

## Known issues
- Specialized queue schemas share a common control-column pattern; JobId linking remains text/key based on each list.
- Index registration of any *new* AI list names (if added later) must go through parent shared-file recommendations — not this agent.

## Dependencies / tools
python3 (offline schema check). Live apply needs PnP on Dev only (parent).

## Important commands
```bash
cd ".worktrees/ai-governance-work-queues"
python3 tests/ai/run_offline_tests.py
```

## Do not
- Touch Production
- Edit shared indexes or deployment engines
- Interrupt CRM Maker OA / smoke / auth
- Commit `AGENT_BOOTSTRAP_PROMPT.md` / `AGENT_COMMS_ACTIVATE.md`
- Auto-approve external send (`AutoApproveAllowed` must stay false in v1.x)

## Module status
**READY FOR INTEGRATION**
