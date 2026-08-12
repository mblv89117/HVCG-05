# GATE-M365-SECOND-BRAIN-PROD — Sprint 16 Evidence Pack

**Gate status:** CLOSED · **satisfied:** false

| Control | Code/Config | Tests | Non-Prod | Prod validation | Status | Blocker |
|---------|-------------|-------|----------|-----------------|--------|---------|
| Identity model | Hub JWT + BA map | N, EB-C | DEV | Required | PARTIAL | LIVE_VALIDATION_REQUIRED |
| Client permission parity | second_brain_query + docs | B | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Risk ACL parity | elevated_risk | E | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Restricted filtering | Owner/Risk/HR | C, E | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Source/version/freshness | document layer | S13/S15 | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Audit logging | security events | T | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Prompt injection | untrusted content | J | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Cross-client negatives | Case B | B | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Production secrets | not embedded | O, P | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Graph≠Atlas auth | graph_atlas_authorize | Graph test | DEV OK | Required | IMPLEMENTED_IN_DEV | LIVE_VALIDATION_REQUIRED |
| Monitoring | designed | — | — | Required | DESIGNED | LIVE_VALIDATION_REQUIRED |
| Owner authorization | gate | — | — | Required | PENDING | OWNER_GATE |

**Owner action:** Do not enable live Production Graph RAG.
