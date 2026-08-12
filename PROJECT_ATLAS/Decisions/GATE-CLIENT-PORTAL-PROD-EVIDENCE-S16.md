# GATE-CLIENT-PORTAL-PROD — Sprint 16 Evidence Pack

**Gate status:** CLOSED · **satisfied:** false

| Control | Code/Config | Tests | Non-Prod | Prod validation | Status | Blocker |
|---------|-------------|-------|----------|-----------------|--------|---------|
| External authentication | Hub Entra JWT | auth middleware | Dev optional | Required | PARTIAL | LIVE_VALIDATION_REQUIRED |
| Client isolation | assertClientAccess + BA | A, G | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Server-side doc auth | secure_download_authorize | F, G | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Risk/HR/Owner exclusion | visibility classes | C, E, G | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Secure upload | validate_upload + quarantine | H, I | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Malware/AV | scan lifecycle interface | I | Interface | Required | INTERFACE_ONLY | LIVE_VALIDATION_REQUIRED |
| Audit logging | security_audit_event | T | DEV OK | Sink | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Download authorization | re-auth at request | F | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Secrets/config | validate_environment_config | O, P | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Monitoring/rollback | designed | — | — | Required | DESIGNED | LIVE_VALIDATION_REQUIRED |
| Owner approval | gate docs | — | — | Required | PENDING | OWNER_GATE |

**Owner action:** Do not OPEN / launch external portal.
