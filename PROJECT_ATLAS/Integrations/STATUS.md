# Universal Integration Layer — Implementation Status

**Honesty date:** 2026-08-18  
**Prior document date:** 2026-07-20 (adapter-framework snapshot — **stale as a picture of LIVE Atlas**)  
**Status SoR:** [../CURRENT_STATE.md](../CURRENT_STATE.md)

Two different things were collapsed in the July 20 note. Keep them separate.

## LIVE (production Hub — not this git HEAD)

LIVE Hub zip `d22b55f870efc0c105ed328a20a4ba4df077e6aa` at `https://app-atlas-integration-hub.azurewebsites.net` (Azure deploy `501fb29b-80f6-427d-8c65-3f1a88da52d9`).

| Path | LIVE status | Evidence |
|------|-------------|----------|
| Website contact / EVA / Book → Atlas | **LIVE ingest exists** | Hub `/health` `websiteLeads.configured=true`. www → Azure Table buffer `HvcgWebsiteLeads` → keyed `POST /api/website/leads` → SharePoint `HVCG_Leads`. Not a second CRM. |
| SharePoint PM Graph | **LIVE** | `/health` `pmBackend.mode=sharepoint`, `authRequired=true`, `insecureDevAuth=false` |
| Capital Graph mode | **LIVE `sharepoint`** | `/health` `capitalBackend.mode=sharepoint`; overlay durable. **ACCG01 ACL Apply was not run.** |
| Google Workspace / GitHub live consent | **NOT LIVE** | Owner credentials / admin consent for those adapters were not certified as production ingest. Do not infer them from website leads. |
| Opportunity CRM operator | **NOT LIVE** | Candidate `a43803edb29a3f8dd080033ca579a09532d89fbc` on `feature/atlas-crm-operator`. Not live-certified. |

`origin/main` remains `b641fdd784b9d9cc50b85f2e5548526da4f28a02` and is **not** this LIVE Hub.

## Repo adapter framework (July 20 work — still in git, not the LIVE lead path)

The provider-adapter framework on `cursor/atlas-integration-release` remains a Connections Center / OAuth backlog. It is **not** how production website leads reach `HVCG_Leads`.

| Epic | Status |
|------|--------|
| Provider-adapter framework (`@hvcg/atlas-integration-core`) | Implemented in repo |
| Secret encryption (AES-256-GCM) + Key Vault–ready env | Implemented in repo |
| Connection / sync / audit store | Implemented in repo |
| OAuth callback host | Implemented in repo |
| Microsoft Graph connector (Outlook, SharePoint, OneDrive read) | Implemented in repo — **production PM/leads use Hub MI Graph, not this consent wizard** |
| Google Workspace connector (Gmail, Drive, Calendar read) | Implemented in repo — **live consent not certified** |
| GitHub App / OAuth connector | Implemented in repo — **live consent not certified** |
| Sync engine (retry, backoff, dedupe, isolation) | Implemented in repo |
| Connections Center UI + setup wizard | Implemented in repo |
| Source-of-truth rules + docs | Implemented in repo |
| Automated tests (core + API) | Passing in that lineage when last recorded (14) — do not treat as a LIVE percentage |

## Still blocked on owner (adapter consent — not website ingest)

See `docs/integrations/OWNER_APPROVAL_CHECKLIST.md`:

- Microsoft Entra app + admin consent **for the Connections Center adapters** (production Hub already uses `id-atlas-prod` for PM/leads)
- Google OAuth client
- GitHub App install
- `INTEGRATION_TOKEN_ENCRYPTION_KEY` for that adapter store

Do not rebuild website lead ingest to “finish” this checklist. Website ingest is already LIVE.

## Next after owner approval (adapter layer only)

1. Wire `.secrets/integration.env` for Connections Center adapters  
2. Live consent E2E for Microsoft → Google → GitHub **as adapters**  
3. Validation sync + acceptance tests 1–23  
4. Priority 4 connectors (Teams, Planner, QBO, …)  
5. Autonomous Client 360 ingestion (Client 360 mapping remains fail-closed)  
6. Azure Key Vault injection for staging/production adapter secrets  

None of those items recertifies CRM operator (`a43803e`) or implies `origin/main` is production.
