# GATE-M365-SECOND-BRAIN-PROD — Evidence Sprint 17

**Gate status:** CLOSED · **satisfied:** false  
**Recommended:** policy evidence complete; live Graph pending — **not OPEN**

| Requirement | Implementation | Unit/Dev | Live non-Prod | Prod remaining | Status |
|-------------|----------------|----------|---------------|----------------|--------|
| Identity model | Hub JWT + map | C | Partial | Staging Entra | PARTIAL |
| Client parity | graph_atlas_authorize | G/H | Policy | Live Graph | IMPLEMENTED_IN_DEV |
| Risk/Owner filters | Cases I | I | Policy | Live Graph | IMPLEMENTED_IN_DEV |
| Least privilege | permission inventory | Review | — | Sites.Selected | FLAGGED |
| Prompt injection | untrusted docs | U | Policy | Live | IMPLEMENTED_IN_DEV |
| Audit | events | T/X | File sink | Prod | PARTIAL |
| Live Graph | — | — | CREDENTIAL_REQUIRED | Required | BLOCKED |
| Monitoring | — | Y | Designed | Required | DESIGNED |

**Owner action:** Do not enable Production Graph RAG.
