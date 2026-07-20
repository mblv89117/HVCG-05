# QuickBooks Online Integration Architecture — Project Atlas

## Purpose

Atlas is the financial operating system. **Plaid** provides verified banking. **QuickBooks Online (QBO)** provides accounting. These are complementary, never-merged data sources.

| Source | Provenance | Atlas role |
|--------|------------|------------|
| Plaid | `VerifiedBank` | Cash, bank transactions, liabilities |
| QuickBooks | `ImportedAccounting` | GL, AR/AP, P&L, balance sheet, COA |
| Manual entry | `ClientEntered` | Operator overrides |
| Atlas derived | `AtlasGenerated` / `EstimatedDerived` | Computed KPIs |

**Hard rule:** QBO sync must never overwrite Plaid balances or change `VerifiedBank` provenance.

## Components

```
Elite OS SPA (/accounting)
        │  VITE_QBO_API_BASE (optional)
        ▼
atlas-qbo-api (:8788)
        │  AES-256-GCM token vault
        │  Azure Key Vault / .secrets/qbo.env
        ▼
Intuit OAuth 2.0 + QBO Accounting API
        │
        ▼
Encrypted file store (dev) → Dataverse / Azure later
```

| Package | Path |
|---------|------|
| API | `apps/atlas-qbo-api` |
| Contracts | `packages/atlas-qbo-contracts` |
| UI | `apps/atlas-elite-os/src/pages/AccountingConnectionsPage.tsx` |
| Browser client | `apps/atlas-elite-os/src/integrations/qbo/api.ts` |

## OAuth 2.0

1. User accepts consent (`atlas-qbo-consent-v1`).
2. `POST /api/qbo/oauth/start` → CSRF `state` + Intuit authorize URL.
3. Browser redirects to Intuit; callback `GET /api/qbo/oauth/callback?code&state&realmId`.
4. API exchanges code for access + refresh tokens; encrypts both; stores connection.
5. Initial sync runs (best-effort); UI shows connection health.

Reconnect uses the same flow with `mode=reconnect` and preserves checkpoints where possible.

## Token security

- Access + refresh tokens stored as AES-256-GCM ciphertext (`v1:iv:tag:cipher`).
- Key: `QBO_TOKEN_ENCRYPTION_KEY` / Key Vault `qbo-token-encryption-key`.
- Refresh token rotation on every successful refresh (Intuit may issue a new refresh token).
- Browser never receives tokens. Audit logs redact tokens and realm IDs.

## Sync engine

- **Bootstrap:** SQL query per entity (`Account`, `Customer`, `Vendor`, `Invoice`, `Bill`, `Payment`, `Deposit`, `Purchase`, `JournalEntry`, `Class`, `Department`, `Item`).
- **Incremental:** CDC with per-entity checkpoints (`changedSince`).
- **Reports:** ProfitAndLoss, BalanceSheet, CashFlow, GeneralLedger snapshots.
- **Bank Transactions:** Derived lineage from Purchase + Deposit as `BankTransaction` with `source: QuickBooks` (distinct from Plaid).
- **Resume:** `syncResume` pointer (`runId`, `nextEntityIndex`) survives interrupted runs.
- **Scheduler:** interval `QBO_SYNC_INTERVAL_MS` (default 15m) for active connections.
- **Retry:** exponential backoff on 429/5xx and transient network errors.

## Multi-tenant

Every connection and entity row is scoped by `organizationId` + `clientId`. Principal headers (`x-atlas-*`) enforce client access (same pattern as Plaid).

## API surface (browser-safe)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | `qboConfigured`, env |
| GET | `/api/qbo/connections` | Summaries only |
| GET | `/api/qbo/accounting-snapshot` | `ImportedAccounting` KPI |
| POST | `/api/qbo/oauth/start` | Returns authorize URL |
| GET | `/api/qbo/oauth/callback` | Intuit redirect |
| POST | `/api/qbo/sync` | Manual / resume |
| POST | `/api/qbo/disconnect` | Revoke + wipe ciphertext |

## UI — Accounting Connections

Exposes: Connect, Disconnect, Reconnect, Manual Sync, Last Sync, Company Name, Realm ID, Sync Status, Connection Health, OAuth Status, Token Status, Error Messages.

## Non-goals (Phase 1)

- Writing journals/payments back to QBO
- Merging QBO cash into Plaid VerifiedBank KPIs
- Production Intuit app (Sandbox only until Production GO)
