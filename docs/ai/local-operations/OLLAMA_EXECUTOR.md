# Ollama Executor Design

- Client: `apps/atlas-integration-api/src/local-ai/ollamaClient.ts`
- Executor: `ollamaExecutor.ts`
- Config: env + `.secrets/local-ai.env` via `ollamaConfigLoader.ts`
- Cancellation: in-memory AbortController map by `aiJobId`
- Timeouts: configurable (`OLLAMA_TIMEOUT_MS`, default 120s)
- Retries: job-level retry limits (existing)
- Logging: correlation IDs + lengths only — **no raw unredacted prompts**
- Model replacement: change `OLLAMA_MODEL` without code changes
