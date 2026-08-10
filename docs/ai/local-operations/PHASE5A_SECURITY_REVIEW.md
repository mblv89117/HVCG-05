# Phase 5A Security Review

- Local-only intake; Production origins rejected  
- Loopback Ollama only (existing executor policy)  
- No public unauthenticated intake  
- No Production website connection  
- No external APIs from EVA path  
- No shell / tool execution from submissions  
- No secrets or DB credentials in browser form  
- Auth principal required on EVA routes  
- Audit events + correlation IDs on intake / match / AI / decisions  
- Safety flags remain false (`EvaIntakeEnabled`, writes, external msgs, client emails)  
- Injection heuristics on input; forbidden-claim scan on model output  
