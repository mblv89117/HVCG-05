# Plaid Data Model — Migration Spec

**Target stores:** Encrypted Dev file store (now) → Dataverse `hvcg_plaid*` entities (production)

## Entities

| Entity | Purpose | Key fields |
|--------|---------|------------|
| ConsentRecord | Client consent | org, client, version, acceptedAt, textDigest |
| PlaidConnection / PlaidItem | Linked Item | org, client, itemId, accessTokenCiphertext, institution*, status, syncCursor |
| FinancialInstitution | Institution metadata | institutionId, name |
| FinancialAccount | Accounts | mask (last4), type, balances, provenance=VerifiedBank |
| AccountBalance | Balance history (optional) | asOf, current, available |
| BankTransaction | Transactions | transactionId unique, amount, date, pending |
| Liability | Credit/loan liabilities | accountId, type, min payment |
| AccountOwnerIdentity | Identity product | names/emails hashed or truncated per policy |
| StatementRecord | Statement metadata | period, download refs — not full PDF in DB by default |
| PlaidSyncCursor | Cursor SoR | itemId, cursor, updatedAt |
| PlaidWebhookEvent | Idempotent webhook log | digest, type, code, status |
| PlaidAuditEvent | Security audit | action, actor, outcome — **no secrets** |

## Mandatory columns (all sensitive tables)

- `organizationId`
- `clientId` (+ `clientCode`)
- `createdAt` / `updatedAt`
- `connectionStatus` where applicable
- `dataSource` = `Plaid`
- `lastSyncedAt` where applicable
- `deletedAt` soft-delete

## Rules

1. **Never store full account numbers** — mask / last four only.
2. **Never store plaintext access tokens** — AES-256-GCM ciphertext only.
3. **Never store online banking passwords** — Plaid holds credentials.
4. Unique constraint: `(clientId, institutionId)` where status ≠ Disconnected (duplicate-link prevention).
5. Unique constraint: `transactionId` for dedupe.

## Dev store

`apps/atlas-plaid-api/.data/plaid-store.json` (gitignored, mode 0600)

## Production migration path

1. Provision Dataverse tables via managed solution `HVCGPlaidBankConnections`.
2. API repository swap: file → Dataverse Web API with app MI.
3. Cutover after Sandbox QA GO.
