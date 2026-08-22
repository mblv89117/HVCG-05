# Atlas Production Hardening — Agent Handoff

**Generated:** 2026-07-21 (local evening) / evidence stamps through ~2026-07-22T00:07Z  
**Workspace:** `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release`  
**Branch:** `fix/atlas-production-hardening` @ `8d3c7d5` (same tip as `fix/atlas-production-readiness`; **hardening work is largely uncommitted**)  
**Prior tag (do not move/rewrite):** `atlas-v1.0.0-production` → `6a346aa` / points at SWA gate commit `8d3c7d5`  
**Target tag (not cut):** `atlas-v1.0.1-production`  
**Verdict right now:** **NO-GO** for absolute Production GO. Do not invent GO.

**Hardening agent:** `[447eae9f](447eae9f-f0e5-4bfc-b6f2-f2c73fc7e5b0)` — **not mid-flight auth-wait**. Last MFA (`FPQUQU3FK`) **succeeded**; waiter **exited** (`SESSION_HELD` then process ended). No live DeviceLogin/`pwsh` PnP waiter as of this handoff. Continue from cold PnP connect when SharePoint mutation needed.

---

## 1. Mission / Definition of Done

Close confirmed Production gaps and cut **`atlas-v1.0.1-production`** only when **absolute GO** is honest:

| Gap | Absolute-GO requirement |
|-----|-------------------------|
| ClientId orphans | Standard SharePoint Get items works on Projects/Tasks **without** HTTP `$select` workaround; lookups target `HVCG_Clients` / `Title` |
| 5 scaffold flows | Real implementations live in Prod + **functional Succeeded** runs (not activate-only) |
| Manual flows | Functionally tested, not just On |
| EVA | `HVCG_EvaFormCreateLead` E2E **or** explicit owner deferral documented (currently Off by design) |
| Integration Hub | Public SWA uses **hosted HTTPS hub** as normal path (not deploy-time snapshot-as-primary) |
| Solution naming | Durable Production solution (`HVCGAtlasProduction` / equivalent) — not only `HVCGCommandCenterDev` packaging narrative |
| Safety | No HVS mutate; external client-email flows remain Off; `EnableClientEmails=false` until Manny authorizes |
| Release | Commit hardening + tag `atlas-v1.0.1-production` **without** rewriting `atlas-v1.0.0-production` |

**Do not claim absolute GO** while scaffolds fail functional tests, UI depends on snapshot as the normal public path, or ClientId Get items regress.

---

## 2. What’s DONE (verified)

- **v1.0.0 conditional GO package** still stands: SWA Production config, Entra/CORS, 7 clients on public URL, Prod SP persistence E2E, recovery/predeploy tests. Evidence: `deployment/reports/ATLAS_V1_PRODUCTION_RELEASE_GATE.md`.
- **Branch + baseline recorded:** `deployment/reports/atlas-v1.0.1-hardening-baseline.md` (baseline commit `8d3c7d5`).
- **Recovery point:** `deployment/reports/recovery-backup-20260721-atlas-v101/` (+ managed zip copy of `HVCGCommandCenterDev_1.1.5.0`).
- **Automation layer visible in Prod:** 16 HVCG flows in Production Config; managed `HVCGCommandCenterDev` **1.1.5.0**; safe internal recurrents tested Succeeded earlier. Evidence: `deployment/reports/prod-flow-matrix-latest.md` (**note:** matrix predates ClientId recreate — treat ClientId bullets there as stale).
- **ClientId recreate + verify (latest):**
  - Recreated lookups on Projects/Tasks/Deliverables/Decisions/DocumentRequests → Clients list `f60a7d4e-74d9-4b57-8c98-1a7b75d76104`.
  - Projects/Tasks GetItems (no `$select`): **OK**; PnP write/read **ACCG Inc.**
  - Evidence: `deployment/reports/schema/clientid-recreate-latest.md`, `clientid-verify-latest.json` (`generatedAt` 2026-07-22T00:06:31Z).
- **Hosted Integration Hub App Service:** `https://app-atlas-integration-hub.azurewebsites.net/health` → `200` `{"ok":true,"providers":{"microsoft":true,...}}`. Local hub `:8790` also healthy; LaunchAgents `com.hvcg.atlas-hub` / `com.hvcg.atlas-elite` loaded; Elite local `:5180` → 200.
- **SWA public shell:** `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` → 200.
- **Flow functional smoke (partial):** `CreateClientWorkspace` **Succeeded**; `ExecutiveDecisionEscalation` **Succeeded**. Evidence: `deployment/reports/flow-functional-tests-latest.md` (2026-07-22T00:07:52Z).
- **Env safety flags still correct:** `hvcg_EnableClientEmails=false`; MissingDocumentReminders / RenewalReminders / Eva intentionally **Off** in matrix.
- **az/pac auth:** usable for Dataverse/Graph/Flow (account `manny@…` / `manuel@…` pattern used throughout).

---

## 3. What’s IN PROGRESS / BROKEN

| Item | Status | Notes |
|------|--------|-------|
| **Absolute GO / tag `atlas-v1.0.1-production`** | **Not started** | Do not cut |
| **ClientId** | **Mostly fixed; re-verify before GO** | Recreate succeeded after MFA loop. Matrix report still says “orphaned” (stale). Graph test created item with `ClientIdLookupId` **None** once — treat as residual risk; re-check PnP + connector writes before retiring HTTP `$select` workarounds in all flows |
| **MFA / DeviceLogin loop** | **Cleared for now** | Multiple codes issued (`BSUZG292Z`, `A6WCZHQRW`, `ALXQZZ2EL`, **`FPQUQU3FK`**). Last one completed; **no held session process**. Next SP schema work needs a **fresh** DeviceLogin |
| **5 real flows** | **Partial / broken** | Live patches applied ad hoc; repo `Deploy-HVCGFlowDefinitionsToDataverse.ps1` latest report shows **5/5 HTTP 400** (stale vs later manual patches). Functional: ProjectFromTemplate **Failed** (`Condition_Duplicate` / `Log_Success`); DocumentRequests **Failed** (`Get_Open_Duplicates` / `Apply_to_each_Doc`); DeliverableApproval **not in latest functional run** |
| **Hosted hub as SWA normal path** | **Incomplete** | Hub `/health` OK; `/api/client360` → **401** without auth. Public UI still snapshot-oriented for Client 360; SWA not proven on hosted hub as sole path |
| **`HVCGAtlasProduction` solution** | **Partial** | `deployment/reports/hvcg-atlas-production-solution-latest.json` lists solutionId + 16 flows OK; managed artifact on disk still `HVCGCommandCenterDev_1.1.5.0_managed.zip` |
| **EVA E2E** | **Deferred / Off** | Intentional until owner authorizes |
| **Git hygiene** | **Dirty** | Large uncommitted set (flows, scripts, reports, snapshot, hub bicep, etc.). No hardening commit yet on this branch tip beyond shared `8d3c7d5` |
| **Agent 447eae9f** | **Paused / handoff** | Not blocked on a live device code; resume execution from Next steps |

---

## 4. URLs

| Surface | URL |
|---------|-----|
| Elite SWA (public) | https://zealous-rock-0090c7e1e.7.azurestaticapps.net |
| Hosted Integration Hub | https://app-atlas-integration-hub.azurewebsites.net (`/health` OK) |
| Local Elite | http://127.0.0.1:5180 |
| Local Hub | http://127.0.0.1:8790/health |
| Prod SharePoint Command Center | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter |
| Prod Clients site | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients |
| Prod Dataverse | https://orgee2f7545.crm.dynamics.com |
| Maker (PA) | https://make.powerautomate.com → env **HVCG Production** |
| DeviceLogin | https://microsoft.com/devicelogin |

---

## 5. Auth

| Item | Value |
|------|--------|
| PnP Entra app ClientId | `836fb743-6439-4836-b1f2-4a144ce2f762` |
| Preferred account | `manuel@highvaluecapitalgroup.com` (also `manny@…` on az) |
| Pattern | `Connect-PnPOnline -Url <CommandCenter> -DeviceLogin -ClientId 836fb743-…` |
| Last successful code | **`FPQUQU3FK`** (completed; process exited — **do not reuse**) |
| How to resume without losing work | Prefer Graph/`az` tokens for read/validate when possible. For PnP mutations: start **one** fresh DeviceLogin, leave process RUNNING until CONNECTED, then run repair/schema scripts in **same** session if possible. Kill only **expired hung** waiters; don’t spam new codes. Cert/Key Vault unattended auth is **not** enrolled. |
| az / pac | OK for Dataverse workflow PATCH, solution export, Flow API |
| Current DeviceLogin waiter | **None** (as of handoff) |

---

## 6. Exact NEXT steps (ordered)

1. **Re-open PnP session only when needed** — one DeviceLogin to Command Center; announce code; wait for owner MFA; keep session for schema/flow validation.
2. **Re-assert ClientId** — run `Repair-HVCGClientIdLookups.ps1` / verify script; confirm GetItems without `$select`; confirm lookup write sticks (PnP + Graph); refresh `schema-validation` against **Prod** (ignore mock unit-test latest if it still points at example.sharepoint.com).
3. **Fix failing flows in source + Dataverse** — especially `HVCG_CreateProjectFromTemplate` (duplicate condition / logging) and `HVCG_CreateDocumentRequests` (`Get_Open_Duplicates` field names: `Status` vs `RequestStatus`); finish `HVCG_DeliverableApproval` real path + functional test.
4. **Re-run functional matrix** — all five manual flows Succeeded; keep client-email/Eva Off.
5. **Hub → SWA path** — ensure hosted hub serves authenticated Client 360 (or documented public/snapshot policy); set `VITE_INTEGRATION_API_BASE=https://app-atlas-integration-hub.azurewebsites.net`; redeploy SWA; prove `/clients` without relying on snapshot as primary.
6. **Solution packaging** — finish `HVCGAtlasProduction` (or document accepted naming) + export managed package under `releases/`; update rollback notes.
7. **Refresh reports** — `prod-flow-matrix-latest.*`, ClientId verify, functional tests, release gate addendum for v1.0.1.
8. **Commit** (when owner asks / authorized) on `fix/atlas-production-hardening`, then tag **`atlas-v1.0.1-production`** only if checklist below is green. **Never** move `atlas-v1.0.0-production`.

---

## 7. Hard rules

- Do **not** modify/delete **HVS** source files.
- Do **not** enable external client emails / `MissingDocumentReminders` / `RenewalReminders` for external recipients; keep `EnableClientEmails=false` until Manny authorizes.
- Do **not** rewrite, move, or delete tag **`atlas-v1.0.0-production`**.
- No secrets in git.
- Stop for **ONE** exact owner MFA/consent with click steps — don’t invent parallel auth storms.
- Verify **live** state; exit 0 alone is not proof.
- Prefer NO-GO honesty over roadmap essays.

---

## 8. Key file paths / scripts

| Path | Role |
|------|------|
| `deployment/reports/atlas-v1.0.1-hardening-baseline.md` | Baseline + rollback |
| `deployment/reports/ATLAS_V1_PRODUCTION_RELEASE_GATE.md` | v1.0.0 conditional GO |
| `deployment/reports/prod-flow-matrix-latest.md` | Flow On/Off matrix (partially stale on ClientId) |
| `deployment/reports/schema/clientid-recreate-latest.*` | ClientId recreate evidence |
| `deployment/reports/schema/clientid-verify-latest.json` | Post-MFA verify |
| `deployment/reports/flow-functional-tests-latest.*` | Latest functional results |
| `deployment/reports/flow-definitions-deploy-latest.*` | Scripted definition deploy (may be stale/failed) |
| `deployment/reports/recovery-backup-20260721-atlas-v101/` | Hardening recovery point |
| `deployment/scripts/Repair-HVCGClientIdLookups.ps1` | Validate/repair lookups |
| `deployment/scripts/Repair-HVCGClientIdFieldRecreate.ps1` | Recreate missing ClientId fields |
| `deployment/scripts/Deploy-HVCGFlowDefinitionsToDataverse.ps1` | Patch flow clientdata in Dataverse |
| `src/power-automate/definitions/HVCG_*.definition.json` | Source definitions (5 target flows) |
| `infrastructure/azure/bicep/integration-hub.bicep` | Hosted hub infra |
| `scripts/deploy-swa-dev.sh` | SWA deploy (defaults hub base to azurewebsites) |
| `apps/atlas-elite-os/public/client360-snapshot.json` | Deploy-time Client 360 fallback |
| `releases/v1.1.5/artifacts/HVCGCommandCenterDev_1.1.5.0_managed.zip` | Rollback managed package |
| `config/environments/production.json` | Prod URLs + PnP ClientId |

---

## 9. Owner actions still needed

1. **PnP DeviceLogin MFA** when next agent prints a **new** code (https://microsoft.com/devicelogin · `manuel@highvaluecapitalgroup.com` · app `836fb743-…`) — only if SharePoint PnP work resumes.
2. **Interactive Microsoft sign-in on public SWA** (owner MFA UAT) — still a gap from v1.0.0 gate notes.
3. **Authorize** enabling Eva HTTP intake and/or any client-email flows — default remains Off.
4. **Maker connection consent** only if a future import clears Production connection references (currently bound per matrix).
5. **Approve commit + tag** `atlas-v1.0.1-production` after absolute GO checklist is green.

---

## 10. Absolute GO blockers checklist

Mark each only with live evidence:

- [ ] ClientId lookups healthy on Projects/Tasks (+ related lists); Get items **without** `$select` workaround; write/read verified
- [ ] All **five** target flows: real definitions live + functional **Succeeded** (CreateClientWorkspace, CreateProjectFromTemplate, CreateDocumentRequests, DeliverableApproval, ExecutiveDecisionEscalation)
- [ ] Safe non-email recurrents still healthy; email/Eva paths remain Off unless explicitly authorized
- [ ] Public SWA uses hosted HTTPS Integration Hub as **normal** Client 360 path (snapshot fallback only)
- [ ] Hosted hub `/health` OK; Client 360 API usable under intended auth model
- [ ] Production solution packaging story closed (`HVCGAtlasProduction` or accepted equivalent) + rollback zip current
- [ ] Prod schema validation report (real site) compliant / accepted deltas documented
- [ ] Hardening committed on `fix/atlas-production-hardening`
- [ ] Tag **`atlas-v1.0.1-production`** cut; **`atlas-v1.0.0-production` untouched**
- [ ] Owner interactive SWA MFA sign-in verified (or explicit waiver)

**Current rollup:** **NO-GO** — ClientId largely repaired; hub health up; two flows functionally green; two failing; DeliverableApproval unproven in latest run; SWA↔hosted hub not absolute-GO ready; tag not cut.

---

## Agent / process snapshot (brief)

- **447eae9f:** executed Phases A–partial C/D/E; interrupted repeatedly for DeviceLogin; last success = MFA `FPQUQU3FK` + ClientId verify + functional smoke. **Not waiting on a code now.**
- **Terminals:** historical Deploy-HVCGProduction / Import DeviceLogins exist; latest relevant `419896`/`419897` **exited 0**.
- **Do not** assume an in-process PnP session is held — start fresh when needed.
