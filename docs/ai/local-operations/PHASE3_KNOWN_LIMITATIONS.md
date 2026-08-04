# Phase 3 Known Limitations

1. Only one local model installed (`glm-4.7-flash:q4_K_M`); Fast profile falls back to Deep (often 1–2+ minutes per job).
2. Document/meeting/client enrichments combine heuristic scaffolds with model JSON — not full OCR / PDF pipelines.
3. Elite UI Edit Redactions is available; advanced multi-file upload UX is still paste-oriented.
4. SharePoint `HVCG_AIApprovals` sync is not deployed; queue is local Hub storage.
5. Live owner-approved non-synthetic content requires explicit `ownerApprovedLiveContent` each pack.
6. Cancel-during-process depends on in-flight Ollama job cancellation hooks; very long GLM jobs may still finish a token stream before cancel is observed.
7. Performance thresholds flag latency but do not auto-throttle.
