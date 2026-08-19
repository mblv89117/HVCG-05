# OWNER_DECISIONS — interrupt policy

**As of:** 2026-07-15 18:30 PT  
**Owner contact:** Master PM only  

## When Master PM will interrupt you

| Type | Examples |
|------|----------|
| Legal approval | Contracts, terms publish, counsel-required policies |
| Financial approval | Reprice, new fees, payment connects, spend |
| Production deployment | Any Prod write/deploy |
| Credentials | Graph, PnP, new M365 auth, API keys |
| Client-specific | Invites, outbound contact, engagement changes |

## Open owner gates

| ID | Type | Ask |
|----|------|-----|
| BL-GRAPH-1 | Credentials | Microsoft Graph read-only (optional) |
| BL-PNP-1 | Credentials | PnP for SharePoint Comm Site provision (staging test can proceed locally) |
| BL-C1 | Client / Legal | **Any** outbound client contact / portal invite — collections drafts wait here |
| BL-F1 | Financial | Mercury/Stripe/bank **connections** |
| PROD-1 | Production | Production deployment |
| BL-PUBLISH-1 | Legal / marketing | **Public** website DNS/publish |

## Closed this cycle

| ID | Outcome |
|----|---------|
| BL-P1 | HVCG new-client rate card canonical v1 |
| RC-1 | Dev baseline frozen |
| **BL-ACCG-PRICE** | **CLOSED 2026-07-15** — Keep ACCG on **legacy agreement**; freeze at Access Plus **$4,539/mo**; do **not** apply MSA $12.5k or HVCG $6k drafts; **do not touch** existing-client pricing |
| **BL-ACCG-CLASS** | **CLOSED** — **HVS_LEGACY_CLIENT** · contracting entity **High Value Solution LLC** |
| **BL-W1-STAGING** | **CLOSED for testing** — Staging approved for testing (local + org-restricted when available). **Public publish still requires BL-PUBLISH-1** |

## Standing hard rules

| Rule | Status |
|------|--------|
| Never contact a client automatically without Manny approval | **LOCKED** |
| Never change existing-client pricing | **LOCKED** |
| Never publish website publicly without BL-PUBLISH-1 | **LOCKED** |
| Collections / reminders / follow-ups = draft + approval queue only | **LOCKED** |
