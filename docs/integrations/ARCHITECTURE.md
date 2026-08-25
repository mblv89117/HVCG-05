# Atlas Universal Integration Layer

## Purpose

Secure, expandable provider-adapter hub so Project Atlas can connect to Microsoft 365, Google Workspace, GitHub, and future business systems without rebuilding the platform.

## Stack location

| Component | Path | Port |
|-----------|------|------|
| Core contracts | `packages/atlas-integration-core` | — |
| Integration Hub API | `apps/atlas-integration-api` | `8790` |
| Connections Center UI | `apps/atlas-elite-os` → `/connections` | `5180` |

## Architecture

```
Elite OS Connections Center
        │  HTTPS / JSON (no tokens in browser)
        ▼
atlas-integration-api (OAuth callbacks, sync workers, webhooks)
        │
        ├── IntegrationRegistry
        │     ├── MicrosoftAdapter (Graph — Outlook, SharePoint, OneDrive)
        │     ├── GoogleAdapter (Gmail, Drive, Calendar, Contacts)
        │     └── GitHubAdapter (App / OAuth — repos, issues, Actions)
        │
        ├── Encrypted credential store (AES-256-GCM)
        ├── Connection + sync + audit JSON store (Key Vault in Azure)
        └── Canonical records with source provenance
```

Each adapter implements the standard interface (`connect`, `disconnect`, `verifyConnection`, `refreshAuthentication`, `searchRecords`, `syncNow`, …). Unsupported actions throw `UnsupportedOperationError`. Write actions are blocked in `read_only_discovery` (default).

## Permission modes

1. **Read-Only Discovery** (default) — search/import only  
2. **Managed Synchronization** — approved metadata / Atlas-owned folders  
3. **Workflow Execution** — create approved tasks/issues/folders  
4. **Elevated Administrative** — explicit approval required  

## Source of truth

Field-level rules live in `@hvcg/atlas-integration-core` (`SOURCE_OF_TRUTH_RULES`) and are exposed at `GET /api/integrations/source-of-truth`.

- Emails → Outlook / Gmail remain authoritative  
- Documents → SharePoint / OneDrive / Drive remain authoritative  
- Accounting balances → accounting platform  
- Signed contracts → e-signature / source system  
- Atlas Client 360 curated fields → Atlas  

## Local development

```bash
# Terminal 1 — Hub API (ephemeral encryption key for local only)
INTEGRATION_ALLOW_EPHEMERAL_KEY=1 npm run dev:integration-api

# Terminal 2 — Elite OS
npm run dev
```

Open `http://127.0.0.1:5180/connections` as Owner/Administrator.

## Secrets

Never store secrets in git, markdown, logs, or browser local storage.

Preferred: Azure Key Vault + managed identity. Local: `.secrets/integration.env` (gitignored).

See `apps/atlas-integration-api/.env.example` and `OWNER_APPROVAL_CHECKLIST.md`.

## Expansion

Register a new adapter:

1. Implement `IntegrationAdapter` (or extend `BaseIntegrationAdapter`)  
2. Add registry entry in `apps/atlas-integration-api/src/connectors/registry.ts`  
3. Add OAuth helpers if needed  
4. Document scopes and SoT rules  
5. Expose in Connections Center (auto-lists from registry)  

## Related docs

- [Owner approval checklist](./OWNER_APPROVAL_CHECKLIST.md)  
- [Permissions & scopes](./PERMISSIONS_AND_SCOPES.md)  
- [Troubleshooting](./TROUBLESHOOTING.md)  
