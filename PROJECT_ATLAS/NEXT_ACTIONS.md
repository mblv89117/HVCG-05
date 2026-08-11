# NEXT_ACTIONS

**As of:** 2026-08-11 (post Owner ADR-BA-V2-002 + Sprint 3 Dev)  
**Ordered for Master PM / owner prioritization.** Do not execute gated items without approval.

## Now (BA V2 + production protection)

1. Keep Track 1 **frozen**; keep BL-C1 client emails **Off**.  
2. Protect Absolute GO Production — no BA V2 Production provisioning.  
3. Sprint 2 committed at `16609c4`.  
4. Sprint 3 Dev conversion work is ready on branch (uncommitted until you authorize).  
5. Wire Elite Opportunity progressive disclosure in `revenue-pipeline-product` using `config/business/elite-revenue-commercial-surface.json`.  
6. Maintain requirements ledger at every sprint close.  
7. Do **not** reprice ACCG or other legacy clients.  
8. High Value Founder remains DEFERRED_OWNER_GATE.

## Owner decisions remaining

1. Per-client legacy reprice (only with agreement).  
2. High Value Founder public launch.  
3. Any Production BA V2 provisioning (separate authorization).  
4. Explicit authorization to send proposals (BL-C1).  
5. Authorize Sprint 3 commit when ready.

## Next engineering candidates (gated)

| Action | Track | Gate |
|--------|-------|------|
| Commit Sprint 3 Dev pack | BA-B | Owner |
| Elite commercial surface wiring | Elite / revenue-pipeline-product | Surface contract |
| Client 360 Migration/Revenue panels | BA-J | Sprint plan |
| Capital readiness engine | BA-C | After Sprint 3 commit |
| Full QA written GO | QA / Release | Assignment |
| Plaid Sandbox E2E | Banking | Owner secrets |
| QBO tip merge | Accounting | QA ACK + Master PM |
| Portal / Finance Ops / Ops / AI schema merge | Multi | Post gates |
| Soft UAT conversion CTA | Track 2 | Human QA |
| Hosted private website preview | Track 3 | Owner (not public DNS) |
| Pilot import | Track 2 data | Owner |
| Canvas publish | CRM | D-002 |
| Public DNS | Track 3 | BL-PUBLISH-1 |
| Portal invites | Track 4 | BL-C1 |

## Explicit non-actions

- Do not prepare unauthorized Production BA schema  
- Do not auto-send proposals while BL-C1 active  
- Do not reprice legacy clients from V2 card  
- Do not publicly launch High Value Founder  
- Do not push unless the human asks  
