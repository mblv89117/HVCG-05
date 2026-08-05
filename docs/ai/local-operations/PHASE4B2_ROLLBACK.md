# Phase 4B-2 Rollback

1. Stop Hub/Elite.  
2. Reset branch to `4f16e96` (Phase 4B-1) on `feature/atlas-local-ai-operations` only.  
3. Purge `.data/local-ai-document-staging` and `quarantine/`.  
4. Leave safety flags Off.  
5. Do not touch Production tags/deploys.
