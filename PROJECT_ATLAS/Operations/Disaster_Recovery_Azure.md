# Disaster Recovery — Azure foundations (Sprint 11)

## Scope

Covers Azure resources for Project Atlas on **HVCG Production**. Dataverse / SharePoint DR remains in root `DISASTER_RECOVERY.md`.

## RPO / RTO (Azure layer)

| Component | RPO | RTO | Notes |
|-----------|-----|-----|-------|
| Static Web Apps | last successful deploy | < 1 hour | Redeploy from Git + SWA token |
| Key Vault secrets | 0 (manual export optional) | < 2 hours | Soft-delete 7 days; restore purged secrets carefully |
| App Insights / LAW | N/A (telemetry) | < 1 hour | Recreate workspace; historical loss acceptable for Dev |
| Managed Identity | config-as-code | < 30 min | Recreate + re-assign RBAC |

## Restore order

1. Confirm subscription `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`
2. `bash infrastructure/azure/scripts/provision-atlas-foundations.sh`
3. Restore Key Vault secrets (from secure backup / owner vault)
4. Redeploy Elite OS: `bash scripts/deploy-swa-dev.sh`
5. Re-validate Entra redirect URIs + Dataverse CORS
6. Confirm App Insights ingestion

## Forbidden

- Do not fail over to deprecated subscription `866189c6-5aa0-4037-8094-05771caceb0d`
- Do not disable soft-delete without owner approval
