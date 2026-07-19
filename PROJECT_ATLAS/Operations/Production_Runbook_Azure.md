# Production Runbook — Project Atlas Azure (Sprint 11)

## Pre-change checklist

- [ ] `az account show` → HVCG Production (`ebc84d85-b5ff-4c4b-add1-b0a8de31b319`)
- [ ] Change ticket / owner awareness for Prod-impacting work
- [ ] Backup / note current SWA deployment ID
- [ ] Confirm budget headroom under $100/mo

## Deploy Elite OS (Dev SWA)

```bash
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
bash scripts/deploy-swa-dev.sh
```

## Rotate secrets

1. Sign in as Owner (Key Vault Administrator on `kv-atlas-hvcg-ebc84d85`)
2. Set new secret versions in Key Vault
3. Restart / redeploy consumers (SWA has no server secrets; MI for future Azure backends)

## Rollback SWA

Redeploy previous known-good build artifact from Git tag using the same deploy script.

## Emergency contacts

Manuel Barela — manny@highvaluecapitalgroup.com
