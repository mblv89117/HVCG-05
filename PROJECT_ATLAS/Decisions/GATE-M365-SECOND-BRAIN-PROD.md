# PRODUCTION GATE — M365 / Second Brain Live Retrieval

**Gate ID:** `GATE-M365-SECOND-BRAIN-PROD`  
**As of:** 2026-08-11 · **CR:** CR-HVCG-BA-V2-001  
**Rule:** Dev retrieval fixtures ≠ Production live Graph/SharePoint RAG.

## Required before Production

- [ ] Identity model reviewed (delegated/application)  
- [ ] Client permission parity  
- [ ] Risk ACL parity (`GATE-RISK-ELEVATED-ACL-PROD`)  
- [ ] Restricted document filtering  
- [ ] Source/version/freshness controls  
- [ ] Audit logging  
- [ ] Prompt-injection defenses  
- [ ] Cross-client negative tests  
- [ ] Production secrets management  
- [ ] Monitoring  
- [ ] Explicit Owner authorization  

**Does not block:** Sprint 13 Development Second Brain document retrieval.
