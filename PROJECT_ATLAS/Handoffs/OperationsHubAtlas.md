# Operations Hub Atlas — Handoff (pre-commit QA stop)

**Status:** **READY FOR QA** · development mock only · **do not commit yet**  
**Branch:** `cursor/operations-hub-sprint1`  
**Worktree:** `.worktrees/operations-hub-sprint1`  
**Base package:** Sprint 1 Phase 1 @ `0f8f6da`

## Delivered

1. Full Atlas mission module set (16 mission modules + retained Sprint 1 workforce/project/AI views)
2. Role-gated navigation with grouped sidebar
3. Calendar Integration **Architecture** page (explicitly no live integrations)
4. Mock data for HR, hiring, training, vendors, assets, scorecards, reviews, KPIs
5. Unit + Playwright QA package under `PROJECT_ATLAS/QA/OperationsHubAtlas/`

## Run locally

```bash
cd apps/hvcg-operations-hub
npm install --cache ./.npm-cache
npm run dev
```

## Verify

```bash
npm run qa:all
```

## Guardrails

- Development only  
- No production integrations  
- No Revenue / Portal / ECC / Finance / CRM / Activation / Production / Track 1 edits  
- **No commit / push / merge / deploy** until owner approves QA  

## Owner review package

- Architecture: `PROJECT_ATLAS/Architecture/OperationsHubAtlas.md`
- Sprint: `PROJECT_ATLAS/Sprints/Sprint_OperationsHubAtlas.md`
- QA: `PROJECT_ATLAS/QA/OperationsHubAtlas/`
