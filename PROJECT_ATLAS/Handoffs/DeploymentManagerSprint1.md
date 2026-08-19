# Handoff — Deployment Manager Sprint 1

**Branch:** `cursor/deployment-manager-sprint1`  
**Worktree:** `.worktrees/deployment-manager-sprint1`  
**App path:** `apps/hvcg-deployment-manager/`  
**Mode:** mock-only

## How to run

```bash
cd .worktrees/deployment-manager-sprint1/apps/hvcg-deployment-manager
npm install --cache .npm-cache
npm run qa:all
```

## Guardrails for next engineer

- Do not deploy
- Do not modify Track 1 / Production
- Do not edit shared Atlas indexes (use ProposedUpdates)
- Await owner approval before commit/push
