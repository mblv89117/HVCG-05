# Production Infrastructure Readiness Report

**Role:** Azure Platform Specialist  
**Mission:** Production Release Infrastructure · Executive Dashboard Release support  
**Subscription:** HVCG Production `ebc84d85-b5ff-4c4b-add1-b0a8de31b319`  
**Report date:** 2026-07-20  
**Scope:** Product Azure only — no Atlas Runtime / ATLAS-R  

**Verdict:** **CONDITIONAL — foundations ready; production cutover not approved yet**

Azure foundations required for the Executive Dashboard release path are in place.  
**Do not treat this as authorization to provision a production Static Web App or any new Azure services.**  
Master PM approval is required before any production resource creation or production deployment.

Deprecated subscription `866189c6-5aa0-4037-8094-05771caceb0d` was not used.

---

## 1. Completed resources (live)

| Resource | Status | Evidence |
|----------|--------|----------|
| Six Atlas RGs + standard tags | Complete | Live `az group list` |
| `swa-atlas-elite-os-dev` (Free) | Complete / healthy | HTTP 200; HSTS; CSP |
| SWA app settings | Clean | `properties: {}` — no secrets |
| `kv-atlas-hvcg-ebc84d85` | Hardened | Soft-delete, purge protection, RBAC |
| KV secret inventory | Empty (expected) | No secrets stored yet |
| `id-atlas-prod` | Complete | Key Vault Secrets User only (least privilege) |
| Owner KV Admin | Complete | `manny@highvaluecapitalgroup.com` |
| `appi-atlas-prod` → `law-atlas-prod` | Complete | Log Analytics ingestion mode; 30d retention |
| `ag-atlas-ops` | Complete | Email → owner |
| Failure Anomalies smart detector | Complete | On App Insights |
| `budget-atlas-100` ($100, 50/75/90/100%) | Complete | Cost guardrail |
| IaC (`infrastructure/azure`) | Present | Bicep/ARM/provision script |
| Product assessment doc | Present | `docs/deployment/AZURE_PRODUCT_INFRASTRUCTURE.md` |

**Not provisioned (by design / awaiting approval):** production SWA, App Service, Functions, Storage, VNet/PE, Azure OpenAI, Service Bus.

---

## 2. Verification checklist (Production Release Infrastructure)

| Check | Result | Notes |
|-------|--------|-------|
| Static Web App configuration | **PASS (Dev)** | Free SKU; staging policy Enabled; no git link (token deploy); HTTPS via SWA platform |
| Key Vault references | **PASS / unused** | Vault ready; **zero secrets** — no Key Vault references in SWA settings |
| Managed Identity permissions | **PASS** | `id-atlas-prod` → Secrets User on Atlas KV only |
| Application Insights telemetry | **PARTIAL** | Resource ready; Elite OS SDK not wired (ATLAS-T-1303); no connection string in KV yet |
| Availability monitoring | **GAP** | No App Insights web tests; SWA returns 200 (manual/HTTP check only) |
| Cost guardrails | **PASS** | `budget-atlas-100` + stepped alerts; duplicate `HVCG` budget marked review-only |
| Environment configuration | **PARTIAL** | Dev SWA active; `rg-atlas-prod` empty (reserved); no prod SWA |

---

## 3. Secrets hygiene

### Approved retrieval mechanisms

| Mechanism | Approved for |
|-----------|----------------|
| Azure Key Vault + RBAC / Managed Identity | Server-side / pipeline secret read |
| GitHub Actions repository secrets | Deploy tokens (e.g. `AZURE_STATIC_WEB_APPS_API_TOKEN_*`) — never committed |
| Entra MSAL (public SPA) | Browser tokens at runtime — not stored in repo |
| Local `.env` (gitignored) | Developer workstation only |

### Scan results (2026-07-20)

| Surface | Result |
|---------|--------|
| Source control (hard-coded secret values) | **PASS** — no InstrumentationKey/AccountKey/ClientSecret/JWT/sk- values found in Elite OS or Azure docs |
| SWA application settings | **PASS** — empty properties |
| Client-side code | **PASS** — public `VITE_*` IDs/URLs only; config states secrets never live in source |
| Documentation | **PASS** — secret *names* only (e.g. GitHub secret name); no values |
| `.env.example` | **PASS** — placeholders only |
| `PROJECT_ATLAS/runtime/secrets/` | Gitignored (runtime out of scope); no committed key files |

**Rule for release:** production secrets must be written to Key Vault by an authorized operator and injected via CI or MI — never into SPA source, SWA app settings as long-lived client secrets, or docs.

---

## 4. Pending owner / Master PM approvals

| Item | Why needed | Azure Platform action until approved |
|------|------------|--------------------------------------|
| Provision `swa-atlas-elite-os-prod` in `rg-atlas-prod` | True production hosting | **Do not provision** |
| Store App Insights connection string in Key Vault | ATLAS-T-1303 / secure telemetry | Wait for Security + elite-ui coordination; no secret values in chat/git |
| GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` | Prod deploy | Deployment Manager owns creation |
| Retire duplicate budget `HVCG` | Cost hygiene | No delete without approval |
| Custom availability / failed-request alert → `ag-atlas-ops` | Prod monitoring bar | Optional; requires Master PM OK if new alert resource |
| Power Platform production environment cutover | Business SoR gate | Power Platform + Master PM — not Azure |

---

## 5. Production dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Entra SPA app registration + prod redirect URI | Administration / Security | Required before prod SWA traffic |
| Dataverse prod CORS for prod SWA origin | Power Platform | Required after prod SWA exists |
| Dataverse / Graph auth for Exec Dashboard | Elite UI + Power Platform | Product path |
| Owner UAT sign-off | QA + Owner | ATLAS-T-1304 path |
| Master PM approval to create prod SWA | Master PM | **Blocking for Azure prod host** |
| Deployment Manager runbook / pipeline | Deployment Manager | Required before every prod deploy |

---

## 6. Deployment dependencies

| Step | Who | Azure Platform role |
|------|-----|---------------------|
| Confirm `az account` = HVCG Production | All | Verify / refuse deprecated sub |
| Align foundations (no new SKUs) | Azure Platform | `provision-atlas-foundations.sh` if drift |
| Build Elite OS | Elite UI | — |
| Deploy to Dev SWA | Deployment Manager | Support; coordinate first |
| Deploy to Prod SWA | Deployment Manager | **Only after Master PM approval + prod SWA exists** |
| Post-deploy: Entra redirect, CORS, telemetry smoke | PP / Security / QA | Azure confirms host health |

**Standing rule:** Coordinate with Deployment Manager **before every production deployment.** Azure Platform does not self-deploy production.

---

## 7. Monitoring status

| Signal | Status |
|--------|--------|
| Platform Smart Detection (failure anomalies) | On |
| Ops action group | On |
| Client App Insights SDK | Not wired |
| Availability web tests | None |
| Budget alerts | On (Atlas + duplicate HVCG) |
| Dev SWA HTTP health | 200 OK (spot check) |

---

## 8. Rollback readiness

| Scenario | Rollback |
|----------|----------|
| Bad Dev SWA deploy | Redeploy prior git artifact via Deployment Manager; SWA Free staging policy available |
| Bad config (public env) | Revert build env / redeploy — no secrets in SWA settings today |
| Key Vault secret mistake | Soft-delete 7d + purge protection — restore prior version; do not purge |
| Need to abandon prod host | N/A until prod SWA exists; RG remains reserved |

---

## 9. Disaster recovery considerations

| Asset | Recovery |
|-------|----------|
| Static app | Git is SoR → redeploy |
| Key Vault | Soft-delete + purge protection |
| Logs / App Insights | Diagnostics only (30d) — not business SoR |
| Business data | Dataverse / M365 — Power Platform backup policy |
| Identity | Entra tenant admin processes |

No Azure Site Recovery or Backup Vault recommended for this SPA architecture.

---

## 10. Coordination log

| Partner | Ask |
|---------|-----|
| Master PM | Acknowledge CONDITIONAL readiness; approve/deny prod SWA + secret population |
| Deployment Manager | Own all prod deploys; confirm pipeline secrets exist before go-live |
| Security Engineering | Review KV RBAC + secret injection pattern; approve App Insights secret handling |
| Data Engineering | Confirm no Azure data-plane dependency for Exec Dashboard SoR |
| Elite UI | Complete App Insights wiring (ATLAS-T-1303) using approved secret path |
| Power Platform | Prod CORS + Dataverse readiness after prod host exists |
| QA & Release | Gate release on UAT + this report’s pending approvals |

Messages posted via `.agent-comms` from `azure-platform` (2026-07-20).

---

## 11. Notification to Master PM

**Azure infrastructure status for production release:**

> Foundations are **ready to support** the Executive Dashboard release on the **Dev SWA** path.  
> Azure is **not fully ready for production cutover** until Master PM approves production SWA provisioning and related secrets/pipeline steps.  
> No additional Azure resources have been or will be provisioned without Master PM approval.

**Assigned:** Executive Dashboard Release support · Azure Platform (`azure-platform`)
