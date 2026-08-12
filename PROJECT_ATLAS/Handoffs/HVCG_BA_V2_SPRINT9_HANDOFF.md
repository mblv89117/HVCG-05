# HVCG BA V2 — Sprint 9 Handoff (Risk, Claims & Liability Reduction)

**CR:** CR-HVCG-BA-V2-001  
**Sprint:** 9 — BA-F Risk, Claims & Liability Reduction OS  
**Date:** 2026-08-11  
**Controls:** NO DEPLOY · NO AGENCY/INSURER/ATTORNEY AUTO-CONTACT · NO APPEAL/CLAIM AUTO-FILE · BL-C1 ACTIVE · NO SPRINT 10

## Sprint 8 commits (prerequisite — done)

| Worktree | SHA |
|----------|-----|
| BA V2 | `a0166e9f12ada81b281ad6774569a46993b19e73` |
| Usable-operating-layer | `34b6f4f92bae07c158cea94decbe63b68b71672e` |

## Sprint 9 Development (pending Owner commit auth)

### BA
- `config/business/risk-operating-policy.json`
- `config/business/risk_claims.py`
- Lists: `HVCG_RiskMatters`, `HVCG_RiskEvidence`
- Approvals types extended
- AGT-TAX-APPEAL / AGT-UE-CLAIM / AGT-INS-REVIEW / AGT-CLAIMS / AGT-HR-DOCS runtimes
- Tests: `test_risk_claims_sprint9.py` (20 OK)
- Audit + coverage + SoR

### Elite
- `RiskClaimsWorkbench.tsx` at `/risk`
- Client 360 Risk section
- Nav wiring (Elite shell — no competing case app)

## Honest non-claims
- Risk product **not** fully `IMPLEMENTED` (live connectors, full ACL productization incomplete)
- PROC-001/002 remain **IN_PROGRESS**
- No external filings/contacts
- No Production mutation
- Sprint 10 (Growth OS) **not** started

## Owner next
1. Review Sprint 9 results  
2. Authorize Sprint 9 commits when ready  
3. Do not begin Sprint 10 until authorized
