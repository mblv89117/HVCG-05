# HVCG BA V2 — Sprint 6 Handoff (Lender-Ready Capital Package)

**CR:** CR-HVCG-BA-V2-001  
**Sprint:** 6 — BA-C2 Lender-Ready Capital Package + Financial Package Agent  
**Date:** 2026-08-11  
**Controls:** NO DEPLOY · NO LENDER SUBMIT · NO CLIENT SEND · BL-C1 ACTIVE

## Sprint 5 commits (prerequisite)

| Worktree | SHA |
|----------|-----|
| BA V2 | `d7d2546804270a956fcb2a3b4afd1fa1f8f28fba` |
| Usable-operating-layer | `0dde092fb9fb0a00276fb5a2f30e24151c2b40a4` |

## Sprint 6 Development (pending Owner commit auth)

### BA
- `config/business/capital-package-policy.json`
- `config/business/financial_package.py`
- Approvals type extensions
- AGT-FIN-PKG runtime binding
- `tests/unit/business/test_financial_package_sprint6.py` (10 OK)
- Audit + coverage updates

### Usable-operating-layer
- Capital workbench package sections
- Client 360 Capital package fields

## Non-claims
- Not Production provisioned
- Not live lender submission
- Not live QBO/Plaid facts in packages
- Sprint 7 (full Fractional CFO) not started

## Owner next
1. Authorize Sprint 6 commits  
2. Review before Sprint 7
