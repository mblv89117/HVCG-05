# Incident Controls (Sprint 16 — practical)

| Scenario | Containment | Evidence | Owner notify | Gate | Re-enable |
|----------|-------------|----------|--------------|------|-----------|
| Cross-client exposure | Disable affected route/feature flag; rotate tokens | Preserve audit events; no log wipe | Immediate | Isolation | Re-test Cases A/B |
| Compromised credential | Revoke Entra sessions; rotate secrets | Capture auth failures | Immediate | Auth | New secrets + validation |
| Malicious upload | Quarantine; SCAN_REJECTED; block download | Keep original immutable | Ops + Owner | Portal/Docs | Scanner clean + ACL retest |
| Wrong document permission | Remove portal visibility; fix ACL | Access audit trail | Owner | Docs | Case F/G |
| Unauthorized agent/tool | BL-C1 block; disable tool | Tool-call audit | Owner | AI | Case L/M |
| Graph permission issue | Disable Graph adapter | Retrieval audits | Owner | M365 | Gate evidence |
| Audit/logging outage | Fail-closed high-risk writes if configured | Health check | Ops | Monitoring | Restore sink |
| Portal security issue | Disable external portal feature | Portal negatives | Owner | Portal | GATE-CLIENT-PORTAL-PROD |

No 24/7 SOC claimed.
