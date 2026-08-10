# Phase 5A Rollback

1. Do not merge or deploy the feature branch.  
2. Stop using `/ai-operations/eva` and `/api/local-ai/eva/*`.  
3. Optionally delete local `.data/local-ai-eva/` SQLite files.  
4. Ensure env keeps `EVA_INTAKE_ENABLED=false` and other safety flags false.  
5. Revert or leave unmerged commits on `feature/atlas-local-ai-operations` — Production tag `atlas-v1.0.1-production` unchanged.
