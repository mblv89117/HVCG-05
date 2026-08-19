# Deployment validation

## Documented path

`.worktrees/track10-elite-ui/PROJECT_ATLAS/Architecture/Track10_Hosting_Teams_Rollback.md`  
Script: `scripts/deploy-swa-dev.sh`

## Validation performed

| Step | Result |
|------|--------|
| Live SWA serves SPA | PASS |
| SPA deep links | PASS (200) |
| Candidate build before redeploy | **FAIL** — cannot ship Sprint 14 source until TS fixed |
| Post-deploy smoke vs commit SHA | **FAIL** — live still Soon/placeholder build |

## Required before next Dev promote

1. Fix ModuleScaffold import + Modules.tsx DataTable typing  
2. Rebuild; confirm no fabricated $ in fallback model  
3. Deploy dist; record `index-*.js` hash + git SHA in release notes  
4. Re-run regression suite R1–R3
