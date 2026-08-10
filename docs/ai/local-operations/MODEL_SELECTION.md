# Model selection guide

Do **not** hard-code model names in application logic.

1. Run `GET /api/local-ai/ollama/discovery` or `curl http://127.0.0.1:11434/api/tags`.
2. Set `OLLAMA_MODEL` to an installed model name.
3. Prefer models that support JSON/`format: json` reliably.
4. Large models (e.g. 30B) need higher `OLLAMA_TIMEOUT_MS`.
5. Replacing the model requires only env change + hub restart.
