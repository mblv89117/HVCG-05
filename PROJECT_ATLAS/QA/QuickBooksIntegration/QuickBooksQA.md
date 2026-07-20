# QuickBooks QA Checklist

Branch under test: `cursor/quickbooks-integration`

## Preconditions

- [ ] `npm run test:qbo-api` passes
- [ ] Without secrets, `GET /health` → `qboConfigured: false`
- [ ] Without secrets, Connect → HTTP 503 (no fake connected company)
- [ ] With secrets (Owner-loaded), `qboConfigured: true`

## OAuth

- [ ] Consent required before Connect
- [ ] Authorize URL is Intuit App Center; no client secret in URL or browser network response
- [ ] Invalid/expired `state` fails callback safely
- [ ] Successful callback creates connection with company name + realm id
- [ ] Reconnect works when status is `NeedsReauthorization`
- [ ] Disconnect revokes locally and clears ciphertext; Plaid untouched

## Sync

- [ ] Manual Sync completes or resumes from checkpoint
- [ ] Entity table shows Accounts, Customers, Vendors, Invoices, Bills, Payments, Deposits, Journal Entries, Classes, Locations (Department), Items, and report checkpoints
- [ ] Interrupted sync leaves `syncStatus: interrupted` and Manual Sync resumes
- [ ] Scheduler does not sync Disconnected companies
- [ ] Retry handles transient 503 (unit-covered)

## Financial intelligence / lineage

- [ ] Accounting snapshot provenance is `ImportedAccounting` / source `QuickBooks`
- [ ] Never displays as `VerifiedBank`
- [ ] Banking page still only shows Plaid VerifiedBank cash
- [ ] No overwrite of Plaid store from QBO sync

## UI — Accounting Connections

- [ ] Connect QuickBooks
- [ ] Disconnect
- [ ] Last Sync
- [ ] Company Name
- [ ] Realm ID
- [ ] Sync Status
- [ ] Manual Sync
- [ ] Connection Health
- [ ] OAuth Status
- [ ] Token Status
- [ ] Error Messages

## Security

- [ ] Access/refresh tokens absent from SPA responses and browser storage
- [ ] Audit log redacts tokens / realm ids / secrets
- [ ] Tenant A cannot list tenant B connections (403)

## Sign-off

| Role | Name | Date | GO / NO-GO |
|------|------|------|------------|
| QuickBooks Specialist | | | |
| Integration & Release Manager | | | |
| Owner | | | |

Production Intuit credentials remain **NO-GO** until Owner completes QuickBooksOwnerActions.md Production section.
