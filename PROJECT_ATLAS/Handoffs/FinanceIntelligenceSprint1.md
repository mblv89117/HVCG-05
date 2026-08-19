# Handoff — Finance Intelligence Sprint 1

**Role:** Finance Intelligence Product Team  
**Branch:** `cursor/finance-intelligence-sprint1`  
**Worktree:** `.worktrees/finance-intelligence-sprint1`  
**Status:** Phase 1 complete — product build ready for owner review

## What shipped

1. Vite/React Finance Intelligence SPA (`apps/hvcg-finance-intelligence/`)
2. KPI scorecards with period, prior, trend, source, refresh, status, drill-down, quality
3. Cash/runway, AR/AP aging, BvA, forecast/scenarios, EV, capital advisory, alerts, AI observations, governance/audit
4. Colorado Craft Beef workspace mappings with incomplete-data labels only
5. Permission matrix + AI Governance review checklist in-product
6. QA package under `PROJECT_ATLAS/QA/FinanceIntelligenceSprint1/`

## How to run

```bash
cd .worktrees/finance-intelligence-sprint1/apps/hvcg-finance-intelligence
npm install --cache ./.npm-cache
npm run dev
npm run qa:all
```

## Recommended commit message (only if owner approves)

```
feat(finance-intelligence): build Finance Intelligence Sprint 1

Add executive financial visibility with labeled HVCG mock KPIs,
CCB incomplete mappings, alerts, scenarios, indicative EV, and QA.
```

## Explicit non-actions until separately approved

- Commit / push / merge / deploy
- Track 1 / Production changes
- Revenue / Portal / ECC / CRM schema modifications
