# Phase 1 Rollback

1. Keep feature flags Off (defaults).
2. Delete or ignore hub file `{dataDir}/local-ai/local-ai-operations.json`.
3. Revert commits on `feature/atlas-local-ai-operations` (do not touch Production tags).
4. SharePoint additive schema was **not deployed** — no tenant rollback required.
5. Elite UI routes `/ai-operations` and Manny panel are inert without hub jobs.

Production tag `atlas-v1.0.1-production` must remain unchanged.
