# GATE-CLIENT-PORTAL-PROD — Evidence Sprint 17

**Gate status:** CLOSED · **satisfied:** false  
**Recommended:** technical staging partial — **not OPEN**

| Requirement | Implementation | Unit/Dev | Live non-Prod | Prod remaining | Status |
|-------------|----------------|----------|---------------|----------------|--------|
| External authentication | Hub Entra JWT | C | :8793 missing bearer | Staging Entra SPA | PARTIAL |
| Client isolation | Hub + BA | A/B/J | Hub | Prod portal | IMPLEMENTED_IN_DEV |
| Doc auth / IDOR | secure download | J/K | Hub | Prod infra | IMPLEMENTED_IN_DEV |
| Risk/Owner exclusion | visibility | D/E | Hub | Prod | IMPLEMENTED_IN_DEV |
| Secure upload | validate + AV lifecycle | L–N | Dev | Real AV | PARTIAL |
| Malware/AV | StagingAvAdapter | L–N | Mock | EXTERNAL | INTERFACE+MOCK |
| Audit | sink | X | File | Prod sink | PARTIAL |
| Monitoring | signals | Y | Designed | Channel | DESIGNED |

**Owner action:** Do not OPEN / launch external portal.
