# Local AI Operations — Phase 1 Architecture

**Branch:** `feature/atlas-local-ai-operations`  
**Baseline:** `atlas-v1.0.1-production` (`dceea798`)  
**Status:** Phase 1 mock control plane only — **no Ollama**, **no Production deploy**

## Objective

Role-neutral control plane so Manny remains the only human decision-maker while a Local AI Operations Agent prepares governed drafts.

## Components

| Component | Location | Notes |
|-----------|----------|-------|
| Shared types / policy / flags | `packages/atlas-integration-core/src/local-ai/` | Work-value, gates, policy engine, decision package |
| Hub store + mock worker + API | `apps/atlas-integration-api/src/local-ai/` | File store under hub data dir; no provider credentials |
| Elite UI | `apps/atlas-elite-os/src/pages/local-ai/` | Manny decision panel + AI Operations Queue |
| SharePoint schemas (repo only) | `HVCG_AIJobs` additive fields + `HVCG_OperationsQueue` | **Not deployed** |

## Boundaries

- Does **not** call Ollama or any external model
- Does **not** write authoritative business records (`wroteAuthoritativeBusinessRecord` always false in Phase 1)
- Does **not** enable EVA or client emails
- Does **not** hard-code former/prospective named operators
- Feature flags default **Off**

## Runtime SoR for Phase 1

Hub local file: `{INTEGRATION_DATA_DIR}/local-ai/local-ai-operations.json`  
SharePoint schemas are forward-compatible contracts only until a future owner-approved deploy.
