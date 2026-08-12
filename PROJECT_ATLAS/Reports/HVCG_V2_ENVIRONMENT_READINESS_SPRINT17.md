# Environment Readiness Matrix — Sprint 17

| Dependency | Environment | Status | Credential/Config Need | Owner Action |
|------------|-------------|--------|------------------------|--------------|
| Local Hub+BA | DEV | AVAILABLE | HVCG_BA_BUSINESS_DIR | None |
| Elite local | DEV | AVAILABLE | Optional .env.local | None |
| BA Dev tenant | DEV | CONFIG_REQUIRED | development.json | Authorize tenant |
| Staging pack | STAGING | UNAVAILABLE | staging env | Authorize pack |
| Atlas v1 Prod Hub | PROD | AVAILABLE_NONPROD_ONLY | No `/api/ba` | Do not use for BA V2 Prod |
| Entra apps | NONPROD | CREDENTIAL_REQUIRED | secrets + SPA ID | Provide staging creds |
| Live Entra JWT | NONPROD | CREDENTIAL_REQUIRED | Hub API token | Issue tokens |
| Graph adapter code | DEV | AVAILABLE | — | — |
| Live Graph | NONPROD | CREDENTIAL_REQUIRED | MICROSOFT_* | Connect staging |
| Portal Prod | PROD | UNAVAILABLE | External launch | Keep gate CLOSED |
| Portal Dev | DEV | AVAILABLE | — | — |
| Real AV | ANY | EXTERNAL_DEPENDENCY | Scanner service | Procure |
| AV mock/fail-safe | DEV | AVAILABLE | — | — |
| QBO worktree | DEV | AVAILABLE | Separate tree | — |
| QBO live | NONPROD | CREDENTIAL_REQUIRED | Sandbox secrets | Authorize |
| Finance SoR confirm | POLICY | CONFIG_REQUIRED | Owner confirm QBO | Confirm |
| Key Vault | AZURE | AVAILABLE | Populated secrets | Populate non-Prod |
| Local .secrets | DEV | UNAVAILABLE | integration.env | Optional |
| BA file audit sink | DEV | AVAILABLE | `.data/s17-audit-sink` | — |
| Alert delivery | NONPROD | EXTERNAL_DEPENDENCY | Webhook/Teams | Configure |
| Prod migration | PROD | OWNER_ACTION_REQUIRED | Separate approval | Do not authorize yet |
