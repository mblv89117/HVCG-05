# Release Notes — EOS Sprint 1 (Development)

**Version:** eos-1.0.0
**Track:** 9
**Environment:** Development only
**Date:** 2026-07-16
**QA / owner status:** APPROVED WITH MINOR CHANGES; feature-branch commit/push authorized

## Added

- `apps/hvcg-engineering-os/` — Command Center + Executive Engineering Dashboard
- Workflow Engine with 14 explicit lifecycle stages
- Change Request System with owner/QA/deployment approvals
- Agent Bus 2.0 message schema and engine
- Master PM automation (sprint/release/owner briefing reports)
- Engineering Analytics KPIs
- Project Atlas Track 9 / Sprint EOS-1 documentation

## Not included

- Production deployment
- Merge to main
- Live git collector (planned EOS-2)
- Breaking changes to agent-comms v1
- Fixes for DEF-EOS-001 through DEF-EOS-005 (accepted for EOS Sprint 2)

## Upgrade / install

Use isolated worktree `.worktrees/track9-eos-sprint1`. Do not merge, tag, or deploy without separate owner authorization.
