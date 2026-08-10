# Phase 6A Architecture — Atlas Website Studio Foundation

**Branch:** `feature/atlas-local-ai-operations`  
**Mode:** Local control plane only · synthetic fixtures · no Production website changes  
**Production baseline:** `atlas-v1.0.1-production` (untouched)

## Intent

Extend Atlas Elite OS and Integration Hub with **Website Studio** so Manny can propose routine website content/SEO changes without opening Cursor for day-to-day edits — while remaining on the Git/code workflow and never becoming an unrestricted visual builder.

## Flow (Phase 6A)

Manny selects website → page → edits / NL request  
→ Local AI prepares proposed content (no file write)  
→ Website Change Request (durable)  
→ Manny approval  
→ sandbox / `website-studio/*` branch apply only  
→ preview & QA scaffolding  
→ **STOP** (no push, no PR create, no merge, no deploy)

## Layers

| Layer | Path |
| --- | --- |
| Schemas / classification / SEO validation / fixtures | `packages/atlas-integration-core/src/website-studio/` |
| SQLite store | `apps/atlas-integration-api/src/website-studio/store.ts` |
| Read-only discovery | `apps/atlas-integration-api/src/website-studio/discovery.ts` |
| Governed Git adapter | `apps/atlas-integration-api/src/website-studio/gitAdapter.ts` |
| Service orchestration | `apps/atlas-integration-api/src/website-studio/service.ts` |
| HTTP | `apps/atlas-integration-api/src/website-studio/http.ts` → `/api/website-studio/*` |
| Elite OS UI | `apps/atlas-elite-os/src/pages/website-studio/WebsiteStudioPage.tsx` → `/website-studio` |

## Persistence

SQLite: `.data/website-studio/website-studio.sqlite` (`WEBSITE_STUDIO_DB` override).  
Sandbox writes: `.data/website-studio/sandboxes/<websiteId>/<changeRequestId>/`.

## Safety invariants

- No Production website modification
- No push / merge / Production deploy
- No arbitrary shell from UI input
- No Local AI autonomous deploy
- Manny final approval for every Production deployment (future phases)
- Real repository registration requires `mannyConfirmedRegistration`

## Feature flags / banners

Phase 6A is always-on as local scaffolding with hard blocks:

- `phase6aNoPush: true` on every change request
- `phase6aNoDeploy: true` on every change request
- Deployment / rollback records: `phase6aNoExecute: true`

Local AI Production flags remain unchanged (`LocalAIWritesEnabled`, `EvaIntakeEnabled`, etc. stay false).

## Related docs

See siblings in this folder: product design, schemas, Git safety, QA/deploy/rollback, AI contract, security, tests, Phase 6B recommendation, owner actions.
