# Atlas Threat Model (Sprint 16 — concise)

| Threat | Control | Tests |
|--------|---------|-------|
| Cross-client leakage | Hub assertClientAccess + BA allowed_clients | A, B, EB-B |
| IDOR / guessed IDs | secure_download_authorize; portal negatives | F, G, EB-G |
| Permission escalation | Concierge permission parity | K |
| Owner Support exposure | DENY + existence concealment | C, D, EB-D |
| Risk/HR exposure | elevated_risk_access / hr_access | E, EB-E |
| Prompt injection | Untrusted document content | J |
| Broad Graph credential | graph_atlas_authorize (Graph≠Atlas) | M365 pack |
| Unauthorized external action | BL-C1 agent+API+tool | L, M, EB-F |
| Upload malware / traversal | validate_upload + scan lifecycle | H, I |
| Secret log leakage | redact_secrets_from_log | P |
| Shadow SoR decisions | Authority precedence (S14/S15) | Integration F |
| Unsafe Production config | validate_environment_config | O |

**Principle:** Fail closed. Dev evidence ≠ Production satisfaction.
