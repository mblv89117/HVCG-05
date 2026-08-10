# Phase 6B Architecture — HVCG Real Repository Pilot

**Atlas branch:** `feature/atlas-local-ai-operations`  
**Candidate A only:** `hvcg-atlas-autonomous-marketing` / `highvaluecapitalgroup.com`  
**Candidate B:** not registered

## Safety

- Production main checkout `/Volumes/MacMiniPro2TB/Autonomous Marketing` remains on `main` and is not edited
- Pilot worktree: `/Volumes/MacMiniPro2TB/.worktrees/hvcg-website-studio-pilot` on `website-studio/hvcg-pilot`
- No DNS / Azure SWA config / secrets / auth / payment / CRM / EVA / webhook changes
- No Production deploy; deploy UI gated with `PRODUCTION DEPLOYMENT REQUIRES SEPARATE MANNY AUTHORIZATION`
- No website file modifications until Manny approves **exact final wording**

## Flow

Register Candidate A → read-only discovery → production baseline → pilot CR with 3 AI variants  
→ Manny select/edit/reject/custom → approve exact wording → (later) apply on worktree → preview/QA → commit → optional push only with explicit Manny push approval → draft PR only → STOP

## Key modules

| Area | Path |
| --- | --- |
| Phase 6B controller | `apps/atlas-integration-api/src/website-studio/phase6b.ts` |
| Bootstrap script | `apps/atlas-integration-api/scripts/phase6b-bootstrap.ts` |
| Evidence | `deployment/reports/website-studio-phase6b/` |
| UI | Elite OS `/website-studio` Phase 6B bootstrap + review panel |
