# Risk / HR ACL Evidence — Sprint 17

| Control | Evidence | Status |
|---------|----------|--------|
| Matter ACL | Live Hub Case E + policy | DEV + live Hub OK |
| HR field strip | Case F `strip_hr_sensitive_fields` | IMPLEMENTED_IN_DEV |
| Restricted field serialization | ssn/salary/hrPrivateNotes null without hr_access | OK |
| Document ACL | RISK_RESTRICTED / RISK_ELEVATED | OK |
| AI parity | Case W + S16 K | OK |
| Audit | security_audit_event + file sink | DEV sink |
| Production ACL evidence | LIVE_VALIDATION_PENDING | CLOSED gate |

**Gate `GATE-RISK-ELEVATED-ACL-PROD`:** CLOSED. Technical evidence strengthened → candidate `READY_FOR_OWNER_DECISION` after Owner review of live identity roles; **not OPEN**.
