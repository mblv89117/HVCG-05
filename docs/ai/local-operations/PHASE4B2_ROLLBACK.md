# Phase 4B-2 Rollback (final)

1. Stop Hub / Elite local processes.  
2. On `feature/atlas-local-ai-operations` only, reset to prior commit if needed (`46ad3ab` pre-hardening or earlier Phase 4B-1 `4f16e96`).  
3. Purge staging: `rm -rf .data/local-ai-document-staging` (includes `quarantine/`).  
4. Optional: leave ClamAV installed (system package) or `brew uninstall clamav` — owner choice; does not affect Production.  
5. Do not touch Production tags, deploys, or merges.  
6. Keep safety flags Off.
