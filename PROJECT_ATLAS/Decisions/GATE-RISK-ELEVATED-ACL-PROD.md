# PRODUCTION GATE — Sensitive Risk Domain Elevated ACL

**As of:** 2026-08-11  
**CR:** CR-HVCG-BA-V2-001  
**Owner rule:** Sensitive Risk domain Production deployment requires verified elevated ACL enforcement.  
**Sprint 10:** Not blocked by this gate (Development continues).

## Current Development state

| Control | Status |
|---------|--------|
| `elevatedAccess` flag on SL-RISK / Risk Matters | Present (Dev) |
| Evidence confidentiality choices (Restricted / Elevated / OwnerOnly / ProfessionalShared) | Present (Dev schema) |
| Client 360 Risk disclaimer + elevated labeling | Present (UI) |
| BL-C1 external Risk action blocks | Enforced in Dev engine/tests |
| Ops `HVCG_Risks` vs `HVCG_RiskMatters` separation | Documented |

**These flags do NOT authorize Production exposure of sensitive Risk data.**

## Affected data classes

* Employee / separation records  
* Tax notices & agency correspondence  
* Insurance policies & claim evidence  
* Attorney / professional review materials  
* Settlement information  
* Sensitive HR records  

## Missing controls (required before Production)

1. Server-side matter authorization  
2. Verified client isolation (negative cross-client tests)  
3. Employee-data field restrictions  
4. Role-based sensitive-field access  
5. Document-level restrictions where required  
6. AI retrieval respecting identical permissions  
7. Audit logging of sensitive access  
8. Negative unauthorized-user tests  

## Production authorization checklist

- [ ] Server-side matter ACL verified  
- [ ] Client isolation tests pass  
- [ ] Employee-data restriction tests pass  
- [ ] Role-based sensitive-field tests pass  
- [ ] Document-level restriction tests pass  
- [ ] AI retrieval permission parity tests pass  
- [ ] Audit logging verified  
- [ ] Negative unauthorized-user tests pass  
- [ ] Explicit Owner Production authorization  

**Gate ID:** `GATE-RISK-ELEVATED-ACL-PROD`  
**Blocks:** Production Risk Matter provisioning / live sensitive Risk UI exposure  
**Does not block:** Sprint 10 Growth Development
