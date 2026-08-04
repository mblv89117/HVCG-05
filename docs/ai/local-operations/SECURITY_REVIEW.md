# Phase 1 Security Review

## Controls implemented

- Feature flags default Off (LocalAI, Writes, ExternalMessages, Eva, ClientEmails)
- Kill switch forces LocalAIEnabled=false
- Mock worker never calls Ollama/external models
- No Production secrets in AI store or prompts
- No direct SharePoint/Dataverse/Outlook/OneDrive/banking/accounting access from AI worker
- Approval gates enforced in service layer for Manny-only actions
- External communication always blocked in Phase 1
- Unauthorized approval rejected (403)
- Idempotency keys on job create
- Retry limits
- Schema validation before Draft Ready / Waiting on Manny
- AuditCorrelationId on every job + append-only audit events
- Separation: drafts vs authoritative records (`wroteAuthoritativeBusinessRecord=false`)
- Forbidden person-name scan for former/prospective hard-coding

## Residual risks / limitations

- Hub Dev auth bypass still exists when `INTEGRATION_REQUIRE_AUTH=false` (pre-existing)
- SharePoint schemas not live — hub file store is Phase 1 SoR
- UI can call Manny decision APIs when signed in; server still enforces actor allow-list
