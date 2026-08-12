# GATE-RISK-ELEVATED-ACL-PROD — Sprint 16 Evidence Pack

**Gate status:** CLOSED · **satisfied:** false

| Control | Code/Config | Tests | Non-Prod | Prod validation | Status | Blocker |
|---------|-------------|-------|----------|-----------------|--------|---------|
| Server-side matter auth | document_os / risk visibility | Case E, EB-E | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Cross-client isolation | assert_client + BA | A, B | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Employee-sensitive fields | hr_access flag | HR notes in matrix | DEV | Required | PARTIAL | LIVE_VALIDATION_REQUIRED |
| Role-based sensitive fields | elevated_risk_access | E | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Document ACL | can_view_document | E, F | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| AI permission parity | orchestrator + concierge | K, B | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Audit logging | security_audit_event | T | DEV OK | Sink | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Unauthorized negatives | Cases E/K | pack | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |

**Owner action:** Do not OPEN until Production ACL evidence complete.
