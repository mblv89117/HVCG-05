# Local configuration guide

1. Ensure Ollama is running and bound to `127.0.0.1:11434`.
2. Copy example into gitignored secrets:

```bash
# Created automatically on hub startup discovery, or create manually:
cat > .secrets/local-ai.env <<'EOF'
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=glm-4.7-flash:q4_K_M
OLLAMA_TIMEOUT_MS=120000
LOCAL_AI_EXECUTOR=ollama
LOCAL_AI_ENABLED=false
LOCAL_AI_WRITES_ENABLED=false
LOCAL_AI_EXTERNAL_MESSAGES_ENABLED=false
EVA_INTAKE_ENABLED=false
CLIENT_EMAILS_ENABLED=false
EOF
```

3. After Phase 2 tests pass, set `LOCAL_AI_ENABLED=true` **only** for local Dev.
4. Do not commit `.secrets/local-ai.env` or discovery JSON.
5. Open WebUI on `:3000` is optional and unused by Atlas.
