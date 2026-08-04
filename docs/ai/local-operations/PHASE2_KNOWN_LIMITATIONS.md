# Phase 2 Known Limitations

- 30B local model can be slow; default timeout 120s
- `ssn_compact` redaction may mask unrelated 9-digit numbers
- Open WebUI not integrated (by design)
- Live Ollama E2E not required for CI; fake client covers contract tests
- SharePoint schemas still not deployed
- `LOCAL_AI_ENABLED` remains false by default until owner enables for local Dev
