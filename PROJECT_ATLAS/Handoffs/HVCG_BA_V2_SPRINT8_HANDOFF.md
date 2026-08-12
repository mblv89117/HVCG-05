# HVCG BA V2 — Sprint 8 Handoff (Procurement & Government Readiness)

**CR:** CR-HVCG-BA-V2-001  
**Sprint:** 8 — BA-E Contract Procurement & Government Readiness OS  
**Date:** 2026-08-11  
**Controls:** NO DEPLOY · NO SAM/VENDOR/PROPOSAL AUTO-SUBMIT · NO CO EMAIL · BL-C1 ACTIVE · NO SPRINT 9

## Sprint 7 commits (prerequisite — done)

| Worktree | SHA |
|----------|-----|
| BA V2 | `fee9d69bd8e1fb248e291e378da3a290746e13ca` |
| Usable-operating-layer | `90f013839155ccb81d0e58c9ebef85d672a12b43` |

## Sprint 8 Development (pending Owner commit auth)

### BA
- `config/business/procurement-operating-policy.json`
- `config/business/contract_procurement.py`
- Lists: ProcurementEngagements, GovernmentRegistrations, ProcurementOpportunities, PastPerformance
- Approvals types extended
- AGT-PROCURE / AGT-GOV-REG / AGT-PROPOSAL runtime binding
- Tests: `test_contract_procurement_sprint8.py` (14 OK)
- Audit + coverage + SoR

### Elite
- `ProcurementWorkbench.tsx` at `/procurement`
- Client 360 Procurement section
- Nav wiring (Elite shell — no competing SPA)

## Honest non-claims
- Procurement product **not** fully `IMPLEMENTED` (live SAM/feeds/Production provision incomplete)
- No external submissions
- No Production mutation
- Sprint 9 (Risk/Claims) **not** started

## Owner next
1. Review Sprint 8 results  
2. Authorize Sprint 8 commits when ready  
3. Do not begin Sprint 9 until authorized
