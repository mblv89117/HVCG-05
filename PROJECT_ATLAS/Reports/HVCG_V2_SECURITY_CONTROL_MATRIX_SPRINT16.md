# Sprint 16 — Security Control Matrix

| Control | Existing | Extended | New | Live Validation Required | Status |
|---------|----------|----------|-----|--------------------------|--------|
| Hub JWT / principal | EXISTING_REUSED | — | — | Prod Entra audiences | IMPLEMENTED_IN_DEV |
| Client allow-list | EXISTING_REUSED | BA map_hub_principal | — | Prod org claims | IMPLEMENTED_IN_DEV |
| Fail-closed missing identity | — | — | NEW_REQUIRED | — | IMPLEMENTED_IN_DEV |
| Document ACL | EXISTING_REUSED | secure_download_authorize | — | Prod download infra | IMPLEMENTED_IN_DEV |
| Upload path/size/type | — | — | NEW_REQUIRED | — | IMPLEMENTED_IN_DEV |
| Malware AV | — | scan lifecycle interface | — | LIVE_VALIDATION_REQUIRED | INTERFACE_ONLY |
| Owner Support ACL + concealment | EXISTING_REUSED | enumerate concealment | — | Prod SP ACL | IMPLEMENTED_IN_DEV |
| Risk elevated ACL | EXISTING_REUSED | gate evidence pack | — | LIVE_VALIDATION_REQUIRED | IMPLEMENTED_IN_DEV |
| Graph ≠ Atlas auth | — | graph_atlas_authorize | — | LIVE_VALIDATION_REQUIRED | IMPLEMENTED_IN_DEV |
| BL-C1 multi-route | EXISTING_REUSED | agent+API+tool | — | — | IMPLEMENTED_IN_DEV |
| Tool side-effect classes | EXISTING_REUSED | classify_tool | — | — | IMPLEMENTED_IN_DEV |
| Config unsafe Production | — | validate_environment_config | — | — | IMPLEMENTED_IN_DEV |
| Secret redaction | — | redact_secrets_from_log | — | — | IMPLEMENTED_IN_DEV |
| Security audit events | EXISTING_REUSED | security_audit_event | — | Prod sink | IMPLEMENTED_IN_DEV |
| Elite↔BA Hub routes | — | — | NEW_REQUIRED | Live Hub E2E | IMPLEMENTED_IN_DEV |
| Monitoring/alerting | DEFERRED | taxonomy | — | LIVE_VALIDATION_REQUIRED | DESIGNED |
| Incident controls | — | docs | — | Owner on-call | DOCUMENTED |
