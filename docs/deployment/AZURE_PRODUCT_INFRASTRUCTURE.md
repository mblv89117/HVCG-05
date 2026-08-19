# Azure Product Infrastructure — Project Atlas

**Role:** Azure Platform Specialist (product-build only)  
**Subscription:** HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`  
**Region:** `westus3` (SWA Free host: `westus2`)  
**Audit date:** 2026-07-20  
**Out of scope:** Atlas Runtime, Durable Functions, Service Bus, cloud-agent orchestration, ATLAS-R

Deprecated subscription `866189c6-5aa0-4037-8094-05771caceb0d` must never be targeted.

---

## 1. Production-readiness status

| Area | Status | Notes |
|------|--------|-------|
| Azure foundations | **Ready** | Six RGs, LAW, App Insights, Key Vault, MI, action group, budget |
| Dev app hosting | **Ready** | `swa-atlas-elite-os-dev` (Free) hosts Elite OS / Executive Dashboard |
| Prod app hosting | **Gap** | `rg-atlas-prod` empty — no production SWA yet |
| Secure config store | **Hardened / empty** | KV soft-delete + purge protection + RBAC; **zero secrets stored** |
| Client telemetry | **Partial** | `appi-atlas-prod` exists; Elite OS wiring is ATLAS-T-1303 |
| Central logs | **Ready** | LAW 30-day retention, App Insights → Log Analytics |
| Health / alerts | **Minimal** | Smart Detection failure anomalies only; no custom metric alerts |
| Deployment | **Dev path** | `scripts/deploy-swa-dev.sh` + GitHub Actions token secret |
| Backup / DR | **Light** | SWA Free has limited SLA; Dataverse/M365 are primary SoR for business data |
| Overall product Azure | **Dev-ready; not prod-complete** | Suitable for Owner UAT on Dev SWA; prod cutover needs prod SWA + secrets + alerts |

---

## 2. Azure resource inventory (live)

### Resource groups

| Name | Environment tag | Contents | Assessment |
|------|-----------------|----------|------------|
| `rg-atlas-dev` | Development | SWA Elite OS Dev | **Active** — product hosting |
| `rg-atlas-monitoring` | Production | LAW, App Insights, action groups, smart detector | **Active** |
| `rg-atlas-security` | Production | Key Vault | **Active** |
| `rg-atlas-shared` | Shared | User-assigned MI | **Active** (identity ready; little runtime attachment yet) |
| `rg-atlas-prod` | Production | *(empty)* | **Reserved** — do not delete; hold for prod SWA |
| `rg-atlas-network` | Shared | *(empty)* | **Reserved** — private endpoints only if later justified |

### Resources

| Resource | Type | RG | Product purpose | Active? |
|----------|------|-----|-----------------|---------|
| `swa-atlas-elite-os-dev` | Static Web App (Free) | rg-atlas-dev | React/TS Elite OS + Executive Dashboard | **Active** |
| `appi-atlas-prod` | Application Insights | rg-atlas-monitoring | SPA + pipeline diagnostics | **Active** (ingest ready) |
| `law-atlas-prod` | Log Analytics (30d) | rg-atlas-monitoring | Centralized logs | **Active** |
| `kv-atlas-hvcg-ebc84d85` | Key Vault | rg-atlas-security | App config / secrets (RBAC) | **Active** (no secrets yet) |
| `id-atlas-prod` | Managed Identity | rg-atlas-shared | Least-privilege Azure→Azure | **Active** (KV Secrets User) |
| `ag-atlas-ops` | Action group | rg-atlas-monitoring | Ops email → manny@… | **Active** |
| Application Insights Smart Detection | Action group (system) | rg-atlas-monitoring | Platform default | **Active** |
| Failure Anomalies - appi-atlas-prod | Smart detector | rg-atlas-monitoring | Failure anomaly alerts | **Active** |
| `budget-atlas-100` | Budget $100/mo | subscription | Cost guardrail | **Active** |
| `HVCG` | Budget $100/mo | subscription | Overlaps Atlas budget | **Duplicate — review** |

SWA URL: `https://zealous-rock-0090c7e1e.7.azurestaticapps.net`

---

## 3. Active vs unused / reserved

| Item | Verdict | Action |
|------|---------|--------|
| Dev SWA, monitoring stack, KV, MI, `ag-atlas-ops`, `budget-atlas-100` | Active | Keep |
| Empty `rg-atlas-prod`, `rg-atlas-network` | Reserved placeholders | Keep until Architecture/Security approve otherwise |
| Budget `HVCG` (duplicate $100) | Likely unused/duplicate | Mark for owner approval before remove |
| App Service / Functions / Storage / VNet / PE / Azure OpenAI / Service Bus | Not provisioned | **Do not create** unless product requirement appears |
| Smart Detection AG (untagged) | Platform-managed | Leave |

No deletion without explicit authorization.

---

## 4. Recommended product infrastructure

Microsoft-native product pattern (approved): **Entra SPA → Azure Static Web Apps → Dataverse Web API + Microsoft Graph**. Azure is the host/monitor/secrets plane; Dataverse is the system of record.

| Need | Use | Do not add |
|------|-----|------------|
| App hosting | Static Web Apps (Dev now; Prod SWA when gated) | App Service for SPA only |
| APIs | Dataverse Web API + Graph (tenant) | Custom API App Service/Functions unless true backend needed |
| Configuration | Key Vault + SWA app settings / CI secrets | Secrets in git |
| Storage | SharePoint / OneDrive / Dataverse file columns | Blob only if product file story requires it |
| Monitoring / logs | App Insights + Log Analytics | Extra APM products |
| AI | Copilot / M365 AI via Graph/tenant | Azure OpenAI until explicit product decision |
| Analytics | App Insights + Power BI / Dataverse | Extra Azure analytics fabric |
| Deployment | SWA deploy token / GitHub Actions | Parallel host stacks |
| Isolation | RG + Environment tags; separate SWA per env | Shared Dev/Prod SWA |

---

## 5. Environment map

| Environment | Platform | Azure | Product surfaces |
|-------------|----------|-------|------------------|
| Local | Dev workstation | none | Vite Elite OS; secrets via `.env` (gitignored) |
| Development | Microsoft | SWA Dev + shared monitoring/KV on HVCG Production sub | Elite OS UAT; Dataverse Dev (`org1131a2b0`) |
| Test / Staging | Planned | Empty today — prefer staging SWA in `rg-atlas-dev` or dedicated RG when needed | Pre-prod |
| Production | Gated | `rg-atlas-prod` reserved; no SWA yet | Owner-gated PP + future prod SWA |

Note: One Azure subscription hosts Dev SWA and shared foundations; Power Platform env separation remains the primary prod gate.

---

## 6. Configuration model

| Config class | Store | Consumers | Notes |
|--------------|-------|-----------|-------|
| Entra SPA client ID, redirect URIs | Entra + SWA / build env | Elite OS MSAL | No client secrets for public SPA |
| Dataverse org URL | Build env / SWA settings | Elite OS | CORS already verified for Dev SWA |
| App Insights connection string | Key Vault → CI inject / SWA setting | Elite OS (ATLAS-T-1303) | Never commit |
| SWA deploy token | GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` | Pipelines | Rotate on owner request |
| Future server secrets | Key Vault + `id-atlas-prod` | Azure services only | MI already has Secrets User |

**Least privilege today:** MI → Key Vault Secrets User on Atlas KV only. SWA has no identity attached (acceptable for Free SPA + browser MSAL).

---

## 7. Monitoring plan

| Signal | Source | Alert path | Cost control |
|--------|--------|------------|--------------|
| SPA failures / exceptions | App Insights | Smart Detection → ops email | 30-day LAW retention |
| Availability | SWA hostname + App Insights availability (optional later) | `ag-atlas-ops` | Skip multi-region probes until Prod |
| Deploy / pipeline failures | GitHub Actions | Team notification | No Azure cost |
| Budget | `budget-atlas-100` at 50/75/90/100% | Owner email | Caps surprise spend |
| Health checks | Prefer SWA static `/` + App Insights page views; Dataverse health is PP | — | No always-on Function probes |

Useful without excess: keep LAW 30d; avoid unbounded custom metrics; wire client SDK once (ATLAS-T-1303).

---

## 8. Deployment support

```bash
az account set --subscription ebc84d85-b5ff-4c4b-add1-b0a8de31b319
bash infrastructure/azure/scripts/provision-atlas-foundations.sh   # align foundations
bash scripts/deploy-swa-dev.sh                                     # Elite OS → Dev SWA
```

- IaC: `infrastructure/azure/bicep/`, `arm/`, provision script  
- CI: `.github/workflows/atlas-elite-swa.yml`  
- Post-deploy: Entra redirect URI, Dataverse CORS, App Insights receiving traffic  

Coordinate: **elite-ui** (app), **deployment-manager** (pipelines), **power-platform** (CORS/Dataverse), **security** (KV/RBAC), **qa-release** (UAT).

---

## 9. Backup and recovery notes

| Asset | Backup / recovery | RPO/RTO expectation |
|-------|-------------------|---------------------|
| Elite OS static assets | Git repo is SoR; redeploy to SWA | Minutes (redeploy) |
| SWA Free | No customer-managed backup; recreate from git | Redeploy |
| Key Vault | Soft-delete 7d + purge protection | Soft-deleted secrets recoverable within retention |
| App Insights / LAW | 30-day interactive retention | Diagnostics only — not business SoR |
| Business data | Dataverse / SharePoint / M365 | Follow Power Platform backup policy (not Azure RG backup) |
| Identity | Entra tenant | Tenant admin DR |

Disaster recovery for the product is **redeploy SPA + restore M365/Dataverse**, not Azure-site recovery. Do not introduce ASR/Backup Vault unless Architecture requires it.

---

## 10. Cost risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| LAW ingestion growth | PerGB2018, no daily cap (`dailyQuotaGb: -1`) | Wire App Insights carefully; revisit cap if volume rises |
| Duplicate budgets | `HVCG` + `budget-atlas-100` both $100 | Consolidate after owner approval |
| Accidental new SKUs | App Service / OpenAI / Functions | Product-value gate; prefer existing |
| Prod SWA Standard | Needed for custom domain / larger SLA later | Budget before upgrade |
| Empty RGs | Near-zero cost | Keep reserved |

Monthly guardrail: **$100** Atlas budget with stepped alerts.

---

## 11. Coordination checklist

| Partner | Azure touchpoint |
|---------|------------------|
| Architecture | Confirm SWA + Dataverse + App Insights + KV pattern (ATLAS-T-1312) |
| Security | KV RBAC, purge protection, no secrets in git, least privilege |
| Data Engineering | Dataverse as SoR; no competing Azure data plane |
| Automation | Deploy scripts / Actions use HVCG Production only |
| QA | SWA URL, telemetry smoke, budget/alert notification tests |

---

## 12. Immediate Azure backlog (product)

1. Store App Insights connection string in Key Vault; wire Elite OS (ATLAS-T-1303) — **elite-ui + azure-platform**  
2. Owner UAT on Dev SWA (ATLAS-T-1304)  
3. When owner gates prod: create `swa-atlas-elite-os-prod` in `rg-atlas-prod` (IaC), not a second monitoring stack  
4. After approval: retire duplicate `HVCG` budget if redundant  
5. Optional: one availability or failed-request alert → `ag-atlas-ops` before prod traffic  

---

*Owner: Azure Platform (`azure-platform`) · ManagedBy=Azure · Application=Project Atlas*
