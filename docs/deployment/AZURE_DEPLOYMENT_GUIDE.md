# Deployment Guide — Azure (Project Atlas / Sprint 11)

## Target subscription (permanent)

```bash
az login --tenant 3df46563-86f3-4414-87fd-84ba967741ef
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
az account show --query "{name:name,id:id,state:state}" -o table
```

Expected: **HVCG Production** / `ebc84d85-b5ff-4c4b-add1-b0a8de31b319` / Enabled.

**Never** set `866189c6-5aa0-4037-8094-05771caceb0d` (deprecated).

## First-time foundation provision

```bash
bash infrastructure/azure/scripts/provision-atlas-foundations.sh
```

Creates/aligns resource groups, Log Analytics, App Insights, Key Vault, Managed Identity, action group, $100 budget alerts, and Dev Static Web App.

## Elite OS → Static Web Apps

```bash
# Token can be omitted — script fetches from SWA secrets when az-authenticated
bash scripts/deploy-swa-dev.sh
```

GitHub Actions: `.github/workflows/atlas-elite-swa.yml`  
Required secret: `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` (and prod equivalents for production environment).

## Power Platform / SharePoint OS deploy

SharePoint + Power Apps install paths remain in root `DEPLOYMENT_GUIDE.md` and `deployment/install/Install-HVCGOS.ps1`. Those are Microsoft 365 tenant operations and are **not** gated on the Azure subscription ID, but all Azure-hosted artifacts must use HVCG Production.

## Post-deploy checks

1. `az account show` → HVCG Production  
2. `az group list --query "[?starts_with(name,'rg-atlas')]"` → six RGs  
3. SWA hostname reachable  
4. Entra redirect URI includes SWA URL  
5. Dataverse CORS includes SWA origin  
6. App Insights receiving telemetry (after first client load)

See also: `PROJECT_ATLAS/Architecture/Azure_Infrastructure_Guide.md`
