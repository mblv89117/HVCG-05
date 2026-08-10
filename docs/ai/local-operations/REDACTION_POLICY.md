# Redaction Policy — Phase 2

SoR: `packages/atlas-integration-core/src/local-ai/redaction.ts`  
Policy version: `1.0.0-phase2`

## Patterns

- Email, phone
- Bank account, routing number
- SSN, tax ID
- Credit card
- Credentials / tokens / API keys / passwords / private keys
- Configurable client-name masking
- Configurable financial-value masking

## Audit fields recorded

- `policyVersion`
- `fieldsRedacted` / counts
- `manualReviewRequired`
- `blocked` (+ reason)

Original unredacted prompts are **not** written to general application logs.
