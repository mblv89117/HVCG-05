# Prompt contract / output schema / redaction / injection / operations

See code SoR:

- Prompt: `packages/atlas-integration-core/src/local-ai/promptContract.ts`
- Output schema: `ollamaOutput.ts`
- Redaction: `redaction.ts` (policy `1.0.0-phase2`)
- Injection: `injectionDefense.ts`
- Allowed ops: `allowedOperations.ts` (9 draft-only operations)

All outputs must remain internal drafts labeled `TEST — SYNTHETIC AI OUTPUT — DO NOT SEND`.
