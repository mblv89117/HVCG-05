# Azure Infrastructure Guide — Project Atlas (Sprint 11+)

## Permanent production subscription

| Field | Value |
|-------|-------|
| Subscription Name | **HVCG Production** |
| Subscription ID | `ebc84d85-b5ff-4c4b-add1-b0a8de31b319` |
| Tenant | High Value Capital Group |
| Tenant ID | `3df46563-86f3-4414-87fd-84ba967741ef` |
| Directory | highvaluecapitalgroup.com |
| Owner | Manuel Barela |
| Default region | `westus3` |

### Deprecated (never use for Atlas)

| Field | Value |
|-------|-------|
| Name | Azure subscription 1 |
| ID | `866189c6-5aa0-4037-8094-05771caceb0d` |

Any script, pipeline, or doc that still references the deprecated subscription is a defect.

## Resource groups

| Resource group | Environment tag | Purpose |
|----------------|-----------------|---------|
| `rg-atlas-dev` | Development | Dev SWA, experimental Azure resources |
| `rg-atlas-prod` | Production | Production Azure workloads |
| `rg-atlas-shared` | Shared | Managed identities, shared services |
| `rg-atlas-network` | Shared | Networking (future VNets / Private Endpoints) |
| `rg-atlas-security` | Production | Key Vault, security controls |
| `rg-atlas-monitoring` | Production | Log Analytics, App Insights, action groups |

## Standard tags

- Company = HVCG  
- Application = Project Atlas  
- Project = Atlas  
- Environment = Development | Production | Shared  
- Owner = Manuel Barela  
- Platform = Microsoft  
- ManagedBy = Azure  

## Canonical resources

| Resource | Name | Resource group |
|----------|------|----------------|
| Log Analytics | `law-atlas-prod` | `rg-atlas-monitoring` |
| Application Insights | `appi-atlas-prod` | `rg-atlas-monitoring` |
| Key Vault | `kv-atlas-hvcg-ebc84d85` | `rg-atlas-security` (soft-delete + **purge protection** enabled) |
| Managed Identity | `id-atlas-prod` | `rg-atlas-shared` |
| Action group | `ag-atlas-ops` | `rg-atlas-monitoring` |
| Static Web App (Elite OS Dev) | `swa-atlas-elite-os-dev` | `rg-atlas-dev` |
| Budget | `budget-atlas-100` | subscription scope |

## Cost management

- Monthly budget: **$100**
- Alerts: **50% / 75% / 90% / 100%** → `manny@highvaluecapitalgroup.com`

## Provision / align

```bash
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
bash infrastructure/azure/scripts/provision-atlas-foundations.sh
```

Bicep sources: `infrastructure/azure/bicep/`  
Subscription config: `infrastructure/azure/atlas.subscription.json`

## CLI defaults

```bash
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
az configure --defaults location=westus3 group=rg-atlas-prod
```


## Key Vault hardening

- Soft delete: enabled (7-day retention)
- Purge protection: **enabled** (ATLAS-T-1302) — irreversible; required before long-lived production secrets
- Authorization: Azure RBAC (`enableRbacAuthorization=true`)
