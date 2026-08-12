# GATE-RISK-ELEVATED-ACL-PROD — Evidence Sprint 17

**Gate status:** CLOSED · **satisfied:** false  
**Recommended Owner state:** READY_FOR_OWNER_DECISION (technical) — **Cursor does not OPEN**

| Requirement | Implementation | Unit/Dev | Live non-Prod | Prod remaining | Status |
|-------------|----------------|----------|---------------|----------------|--------|
| Server-side matter auth | document_os + Hub | E | Hub :8792 Case E | Prod roles | IMPLEMENTED_IN_DEV |
| Cross-client | assert + Hub | A/B | Hub Case B | Org claims | IMPLEMENTED_IN_DEV |
| Employee-sensitive fields | strip_hr_sensitive_fields | F | Dev | Prod field review | IMPLEMENTED_IN_DEV |
| Role-based sensitive | elevated_risk_access | E | Hub | Live Entra roles | IMPLEMENTED_IN_DEV |
| Document ACL | can_view + RISK_RESTRICTED | E/F | Hub | Prod SP | IMPLEMENTED_IN_DEV |
| AI parity | orchestrator | W/K | Dev path | Live agents | IMPLEMENTED_IN_DEV |
| Audit | security events + sink | X | File sink | Prod sink | PARTIAL |
| Unauthorized negatives | pack | OK | Hub | External pen | IMPLEMENTED_IN_DEV |

**Blocker for OPEN:** Production identity/role evidence + Owner authorization.
