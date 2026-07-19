# Operations Guide — Project Atlas Azure (Sprint 11)

## Subscription

Always operate against **HVCG Production** (`ebc84d85-b5ff-4c4b-add1-b0a8de31b319`).

```bash
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
```

## Daily / weekly ops

| Cadence | Action |
|---------|--------|
| Daily | Review Cost Management vs $100 budget |
| Daily | Check `ag-atlas-ops` / budget email alerts |
| Weekly | Review App Insights failures & availability |
| Weekly | Confirm Key Vault access via RBAC (no access policies drift) |
| Monthly | Review Managed Identity role assignments |

## Key resources

- Monitoring: `rg-atlas-monitoring` → `law-atlas-prod`, `appi-atlas-prod`, `ag-atlas-ops`
- Secrets: `rg-atlas-security` → `kv-atlas-hvcg-ebc84d85`
- Identity: `rg-atlas-shared` → `id-atlas-prod`
- Elite UI Dev: `rg-atlas-dev` → `swa-atlas-elite-os-dev`

## Incident triage

1. Confirm subscription is HVCG Production (not deprecated).
2. Check Azure Service Health for westus3.
3. App Insights → Failures / Availability.
4. Key Vault → access denied? verify RBAC on caller / MI.
5. SWA → deployment history + `staticwebapp.config.json` routes.

## Contacts

- Owner: Manuel Barela (`manny@highvaluecapitalgroup.com`)
- Budget alerts: same mailbox
