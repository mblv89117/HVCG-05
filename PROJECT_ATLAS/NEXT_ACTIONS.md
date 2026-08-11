# NEXT_ACTIONS

**As of:** 2026-08-11 (BA V2 overlay on 2026-07-19 program actions)  
**Ordered for Master PM / owner prioritization.** Do not execute gated items without approval.

## Now (BA V2 + production protection)

1. Keep Track 1 **frozen**; keep BL-C1 client emails **Off**.  
2. Treat Elite Production SoR as **Absolute GO** / `atlas-v1.0.1-production`.  
3. Owner: review/accept [CR-HVCG-BA-V2-001](ChangeRequests/CR-HVCG-BA-V2-001.md).  
4. Use [requirements ledger](BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md) as the backlog SoR — nothing material may be IGNORED.  
5. Continue BA-A/B Sprint 2–3 on `cursor/hvcg-business-architecture-v2` (Dev only).  
6. Do **not** activate pricing V2 / paid-diagnostic CURRENT policy without resolving BL-P1 SKU-FRA FREE conflict.  
7. Do **not** reprice ACCG or other legacy clients from V2 ranges.  

## Owner decisions

1. Accept or amend CR-HVCG-BA-V2-001 scope.  
2. Reconcile **paid diagnostic front door** vs **BL-P1 SKU-FRA FREE**.  
3. Decide whether `HVCG-PRICE-2026-08-11-v2` becomes CURRENT for new clients.  
4. Confirm Track 1 freeze + BL-C1 still stand.  
5. High Value Founder public launch remains owner-gated.  
6. Any per-client migration reprice requires written agreement path.

## Next engineering candidates (gated)

| Action | Track | Gate |
|--------|-------|------|
| Full QA written GO on RC1 | QA / Release | Assignment |
| Plaid Sandbox E2E | Banking | Owner secrets |
| Security Sandbox re-review | Security | After Plaid E2E |
| QBO tip merge into integration | Accounting | QA ACK + Master PM |
| Dev SWA redeploy + DEF-ELITE retest | Elite | QA |
| Staging KV prep | Azure | Infra only |
| Portal / Finance Ops / Ops / AI schema merge queue | Multi | Post Owner UAT acceptance |
| Revenue Sprint 5 | Track 2 | Owner assignment |
| Soft UAT conversion CTA | Track 2 | Human QA |
| Hosted private website preview | Track 3 | Owner (not public DNS) |
| Next Prod flow activation | Track 1/7 | New owner approval |
| Pilot import | Track 2 data | Owner |
| Canvas publish | CRM | D-002 |
| Public DNS | Track 3 | BL-PUBLISH-1 |
| Portal invites | Track 4 | BL-C1 |

## Explicit non-actions

- Do not prepare Production  
- Do not add features on Elite RC1 branch  
- Do not merge QBO before QA ACK  
- Do not treat Jul 15 QA dashboard or Master PM `b75b19b` tip as current release authority  
- Do not push unless the human asks  
