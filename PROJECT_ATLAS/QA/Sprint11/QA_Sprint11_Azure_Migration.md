# QA & Release — Sprint 11 Azure Production Migration Checklist

**Subscription under test:** HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`  
**Deprecated must not appear as target:** `866189c6-5aa0-4037-8094-05771caceb0d`

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Subscription selection (`az account show`) | PASS | Name=HVCG Production, State=Enabled |
| 2 | Azure authentication (Entra device code / owner) | PASS | manny@highvaluecapitalgroup.com |
| 3 | Resource naming (`rg-atlas-*`) | PASS | 6 RGs in westus3 |
| 4 | Standard tags applied | PASS | Company/Application/Project/Owner/Platform/ManagedBy + Environment |
| 5 | Log Analytics `law-atlas-prod` | PASS | rg-atlas-monitoring |
| 6 | Application Insights `appi-atlas-prod` | PASS | Linked to LAW |
| 7 | Key Vault `kv-atlas-hvcg-ebc84d85` | PASS | RBAC authorization enabled |
| 8 | Managed Identity `id-atlas-prod` | PASS | Key Vault Secrets User assigned |
| 9 | Budget $100 + alerts 50/75/90/100 | PASS | `budget-atlas-100` |
| 10 | Action group `ag-atlas-ops` | PASS/PARTIAL | Created or verified |
| 11 | Static Web App created | PASS | `swa-atlas-elite-os-dev` → https://zealous-rock-0090c7e1e.7.azurestaticapps.net |
| 12 | Deploy pipeline scripts target HVCG Production | PASS | `deploy-swa-dev.sh`, provision script, GH workflow |
| 13 | Deprecated subscription scrubbed from active docs | PASS | Owner blocker doc rewritten; inventory marks deprecated |
| 14 | Microsoft-native architecture unchanged | PASS | Architect review doc |
| 15 | Dataverse / Power Apps connectivity (Dev) | PASS (prior Track 7) | Model-driven app live; CORS for SWA still platform step |
| 16 | Elite OS deployed to SWA | PASS | Production SWA slot deploy 2026-07-19 |
| 17 | Entra redirect includes SWA URL | PASS | Graph patch on SPA `49d20328-…` |
| 18 | Production Power Platform cutover | N/A / GATED | Not in Sprint 11 Azure scope |

## Sign-off

QA & Release: Sprint 11 Azure foundations + Dev Elite OS SWA deploy **COMPLETE**.  
Production Power Platform remains gated.
