# Azure Staging Readiness — Atlas Integration

**As of:** 2026-07-20  
**Status:** **NOT READY** for staging cutover from this branch

## Permitted targets

| Target | Status |
|--------|--------|
| Local owner UAT | Ready |
| Engineering preview (Dev SWA) | Prior deploy at `ce59f8e` — integration not redeployed |
| Azure staging | Not ready |
| Production | NO-GO |

## Checklist

| Item | Status |
|------|--------|
| Secrets from Azure Key Vault | **BLOCKED** — Plaid Sandbox secrets not confirmed injected |
| HTTPS | Dev SWA has HTTPS; staging env not validated this session |
| Authentication enforced | Elite MSAL present; staging Entra app registration **BLOCKED** owner |
| Environment variables correct | Local `.env.example` present; staging map not applied |
| Database migrations | Plaid uses local encrypted store; Dataverse migrations N/A this cut |
| Logs redact secrets | Plaid redaction unit test **PASS** |
| Monitoring enabled | Not verified for staging |
| Rollback procedure | Revert to tag/commit `ce59f8e` via `.worktrees/elite-ui-release-recovery` + `scripts/deploy-swa-dev.sh` |

## Included infra from Sprint 11

- `infrastructure/azure/bicep/*`
- `infrastructure/azure/scripts/provision-atlas-foundations.sh`
- `scripts/deploy-swa-dev.sh`

## Recommendation

Do **not** deploy staging or production from `cursor/atlas-integration-release` until QA GO + Key Vault Sandbox secrets + Entra staging app ACK.
