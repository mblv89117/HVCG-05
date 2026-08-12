# Migration Rehearsal — Sprint 17

| Item | Result |
|------|--------|
| Source | Staging rehearsal records |
| Taxonomy | 00–13 canonical folders preserved |
| Count | 1 accepted in negative pack |
| Dedupe | sha256(client\|fileName\|content) |
| ACL | Risk/Owner without mapping → QUARANTINE |
| Failures | duplicate, unknown_client, unsupported_category, missing_acl_mapping |
| Rollback | Manifest checksum delete; source unchanged |
| Production migration | **NOT AUTHORIZED** |
