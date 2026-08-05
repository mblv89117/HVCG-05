# Phase 4B-2 Owner Actions Required

1. Review Document Review UI: malware status → extract → Approve Redacted Content → enrichment.  
2. Authorize ClamAV install if desired: `brew install clamav` (+ freshclam). Until then, keep synthetic override local-only.  
3. Optionally run a live Ollama enrich against `qwen2.5:7b-instruct` / `glm-4.7-flash:q4_K_M` and record latencies.  
4. Do not enable Writes / ExternalMessages / EVA / ClientEmails without separate authorization.  
5. Do not push/merge/deploy this branch until authorized.  
6. Purge non-synthetic staged files after review.
