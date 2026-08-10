# Phase 1 Known Limitations

- No live Ollama connection (intentional)
- SharePoint / Dataverse lists not provisioned in Production (schema-only)
- LocalAIEnabled defaults false — jobs stay Pending until enabled or process `force` in tests
- LocalAIWritesEnabled false — Manny approval does not mutate business SoR
- Command Center panel requires signed-in hub auth to load live jobs
- Pre-existing PM defaults still use `person-manny` id in unrelated PM code (not Local AI Operations); Local AI module uses configurable owners only
- node_modules installed in worktree for tests; do not commit
