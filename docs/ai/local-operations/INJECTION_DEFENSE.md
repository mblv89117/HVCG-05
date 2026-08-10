# Injection-Defense Design — Phase 2

SoR: `packages/atlas-integration-core/src/local-ai/injectionDefense.ts`

## Approach

1. Separate system prompt from source content
2. Delimit untrusted content with clear markers
3. Disallow tool execution entirely (no tool channel)
4. Scan for common injection phrases (ignore instructions, send email, delete file, alter record, execute command, provide credentials, contact lender, approve transaction, reveal system prompt)
5. Flag suspicious content; lower confidence; route high-risk to Manny
6. Never elevate permissions from model output

Model output cannot enable writes, EVA, or external messages — feature flags remain authoritative.
