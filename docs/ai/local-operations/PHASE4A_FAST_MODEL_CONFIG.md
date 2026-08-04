# Fast Model Configuration Guide

1. Ensure Ollama is running on `127.0.0.1:11434`
2. Install once (owner-authorized): `ollama pull qwen2.5:7b-instruct`
3. Set in **gitignored** `.secrets/local-ai.env`:

```
OLLAMA_FAST_MODEL=qwen2.5:7b-instruct
OLLAMA_DEEP_MODEL=glm-4.7-flash:q4_K_M
OLLAMA_FALLBACK_MODEL=glm-4.7-flash:q4_K_M
```

4. Restart Integration Hub
5. Confirm `GET /api/local-ai/model-routing` shows `fasterModelAvailable: true`
6. Do not commit `.secrets/` or model weight files
