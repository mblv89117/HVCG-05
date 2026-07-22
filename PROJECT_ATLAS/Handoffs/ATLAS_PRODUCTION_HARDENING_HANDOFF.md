# Atlas Production Hardening — Post-Release Handoff

**Updated:** 2026-07-22  
**Workspace:** `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release`  
**Branch:** `fix/atlas-production-hardening` (merged to `main` via [PR #2](https://github.com/mblv89117/HVCG-05/pull/2))  
**Release commit:** `dceea798fe18a83ba46043d802931a988480f8db`  
**Docs tip (branch):** `c8555efe6d3be5af283e06fa8fd8ab2ee4902d1e`  
**Merge on `origin/main`:** `a3a945bc36610216435e7917c60cbeda28a3ddd7`  
**Tags:**
| Tag | Object / peels to | Status |
|-----|-------------------|--------|
| `atlas-v1.0.1-production` | tag `8b12146c…` → commit `dceea798…` | **Cut** |
| `atlas-v1.0.0-production` | `6a346aa736ba5ecaaff701c3561b1d4b1befd564` | **UNCHANGED — do not rewrite** |

**Verdict:** **Absolute GO completed.** PR https://github.com/mblv89117/HVCG-05/pull/2 **MERGED**.  
**Repo:** https://github.com/mblv89117/HVCG-05.git  

**Canonical handoff:** this file under `PROJECT_ATLAS/Handoffs/` (no duplicate under `deployment/reports/`).

---

## 1. Mission status

Production hardening for **v1.0.1** is **done**: Absolute GO matrix green, release committed, tagged, pushed, and merged to `main`. Next work is **owner confirmation** (Entra re-login) and optional GitHub/solution hygiene — not mid-flight hardening.

Primary evidence:
- `deployment/reports/ATLAS_V1_PRODUCTION_ABSOLUTE_GO.md` — **Verdict: GO**
- `deployment/reports/ATLAS_V1_0_1_PRODUCTION_RELEASE.md` — release record
- `deployment/reports/atlas-entra-role-assignment-latest.md` — SPA app roles + HVCG Owner assignment

---

## 2. Done (verified)

| Area | Result | Evidence |
|------|--------|----------|
| **AtlasClientRef (Case B)** | Migrated; legacy **ClientId** preserved | `deployment/reports/schema/atlas-client-ref-migration-latest.md`, Absolute GO #1/#11 |
| **Five flows** | Functionally **Succeeded** (honest DeliverableApproval lifecycle Approve → SP Approved) | `flow-functional-tests-latest.md`, `deliverable-approval-lifecycle-latest.md` |
| **Client 360 Entra auth** | Anon/forged blocked; signed-in SWA path green; owner UAT passed (Absolute GO) | `client360-auth-security-latest.md`, `signed-in-swa-client360-latest.md` |
| **SWA → hosted hub** | Hosted HTTPS hub is normal Client 360 path | `hub-swa-path-latest.md` |
| **Solution packaging** | `HVCGAtlasProduction` 1.0.1.0 managed + unmanaged | `hvcg-atlas-production-solution-latest.md`, `releases/v1.0.1/packages/` |
| **Absolute GO matrix** | All checklist rows **GREEN** | `ATLAS_V1_PRODUCTION_ABSOLUTE_GO.md` |
| **Git release** | Commit `dceea798…` + tag `atlas-v1.0.1-production` + push; PR #2 merged to `main` | release record + `origin/main` merge `a3a945bc…` |
| **Safety** | `EnableClientEmails=false`; MissingDocumentReminders / RenewalReminders / Eva **Off** | `safety-controls-latest.md` |
| **Entra SPA roles** | Six Atlas app roles on SPA; **HVCG Owner** (`HVCG_Owner`) assigned to `manny@highvaluecapitalgroup.com` | `atlas-entra-role-assignment-latest.md` |
| **HVS / prior tag** | HVS source untouched; `atlas-v1.0.0-production` untouched | Absolute GO #12/#13 |

---

## 3. Current / follow-ups

| Item | Status | Action |
|------|--------|--------|
| **Manny re-login after Entra role** | **Pending confirm** (assignment done; claim needs fresh ID token) | Sign out completely on SWA → sign in as `manny@` → confirm Access Denied cleared and role **HVCG Owner**; then Command Center + `/clients` |
| **GitHub default branch** | Optional | If still `cursor/v1.0.1.0-intelligence-ai-ops`, set default to **`main`** |
| **Managed solution import in Production** | Optional confirm | Confirm `HVCGAtlasProduction_1.0.1.0_managed.zip` applied via intended Production path (or import if not) |
| **`atlas-v1.0.0-production`** | Locked | **Do not rewrite, move, or delete** |

**Not required for Absolute GO resume:** DeviceLogin MFA loops, flow scaffold repairs, ClientId recreate, mid-flight NO-GO work.

---

## 4. URLs

| Surface | URL |
|---------|-----|
| Elite SWA (public) | https://zealous-rock-0090c7e1e.7.azurestaticapps.net |
| Hosted Integration Hub | https://app-atlas-integration-hub.azurewebsites.net |
| Local Elite | http://127.0.0.1:5180 |
| Local Hub | http://127.0.0.1:8790/health |
| Prod SharePoint Command Center | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter |
| Prod Clients site | https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients |
| Prod Dataverse | https://orgee2f7545.crm.dynamics.com |
| Maker (PA) | https://make.powerautomate.com → env **HVCG Production** |
| PR #2 (merged) | https://github.com/mblv89117/HVCG-05/pull/2 |

---

## 5. Auth

| Item | Value |
|------|--------|
| PnP Entra app ClientId | `836fb743-6439-4836-b1f2-4a144ce2f762` |
| Preferred PnP account | `manuel@highvaluecapitalgroup.com` (az often `manny@…`) |
| PnP pattern | `Connect-PnPOnline -Url <CommandCenter> -DeviceLogin -ClientId 836fb743-…` |
| Atlas SWA SPA clientId | `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| Atlas SWA role claim | ID token `roles: ["HVCG_Owner"]` → frontend **HVCG Owner** |
| Owner UPN (SPA role) | `manny@highvaluecapitalgroup.com` |
| az / pac | Usable for Dataverse / Graph / Flow when signed in |
| DeviceLogin waiter | None expected; start **fresh** only if SharePoint PnP mutation is needed |

---

## 6. Owner actions remaining

1. **Confirm Entra role live:** SWA → Sign out → Sign in as `manny@highvaluecapitalgroup.com` → Access Denied gone → role **HVCG Owner** → Command Center + `/clients`.
2. **Optional:** Set GitHub default branch to `main`.
3. **Optional:** Confirm managed `HVCGAtlasProduction` 1.0.1.0 import in Production.
4. **Authorize only when ready:** Eva HTTP intake and/or client-email flows — default remains Off / `EnableClientEmails=false`.

---

## 7. Hard rules (still in force)

- Do **not** modify/delete **HVS** source files.
- Do **not** enable external client emails / `MissingDocumentReminders` / `RenewalReminders` for external recipients; keep `EnableClientEmails=false` until Manny authorizes.
- Do **not** rewrite, move, or delete tag **`atlas-v1.0.0-production`**.
- No secrets in git.
- Verify **live** state; exit 0 alone is not proof.
- Prefer honest status over roadmap essays.

---

## 8. Key evidence / artifacts

| Path | Role |
|------|------|
| `deployment/reports/ATLAS_V1_PRODUCTION_ABSOLUTE_GO.md` | Absolute GO matrix (**GO**) |
| `deployment/reports/ATLAS_V1_0_1_PRODUCTION_RELEASE.md` | v1.0.1 release record |
| `deployment/reports/atlas-entra-role-assignment-latest.md` | SPA app roles + Manny HVCG Owner |
| `deployment/reports/hardening-gate-latest.md` | Hardening gate rollup |
| `deployment/reports/flow-functional-tests-latest.md` | Five-flow Succeeded |
| `deployment/reports/deliverable-approval-lifecycle-latest.md` | DeliverableApproval lifecycle |
| `deployment/reports/client360-auth-security-latest.md` | Anon/forged blocked |
| `deployment/reports/signed-in-swa-client360-latest.md` | Signed-in Client 360 |
| `deployment/reports/hub-swa-path-latest.md` | Hosted hub path |
| `deployment/reports/safety-controls-latest.md` | Emails/Eva Off |
| `deployment/reports/hvcg-atlas-production-solution-latest.md` | Solution packaging |
| `deployment/reports/schema/atlas-client-ref-migration-latest.md` | AtlasClientRef + ClientId |
| `deployment/reports/recovery-backup-20260721-atlas-v101/` | Rollback point |
| `releases/v1.0.1/packages/HVCGAtlasProduction_1.0.1.0_managed.zip` | Managed package |
| `releases/v1.0.1/packages/HVCGAtlasProduction_1.0.1.0.zip` | Unmanaged package |

---

## 9. Rollback (if needed)

1. **Do not move** `atlas-v1.0.0-production`.
2. Restore from `deployment/reports/recovery-backup-20260721-atlas-v101/` (and prior recovery backup if needed).
3. Re-import prior managed package if solution rollback required.
4. Redeploy prior SWA/hub associated with `atlas-v1.0.0-production` (`6a346aa…`) if UI/API rollback needed.
5. Re-confirm `hvcg_EnableClientEmails=false` and email/Eva flows Off.

---

## 10. Resume checklist for next agent

- [x] Absolute GO green; release commit + `atlas-v1.0.1-production` cut
- [x] PR #2 merged to `main`; `atlas-v1.0.0-production` untouched
- [x] Entra SPA app roles defined; HVCG Owner assigned to `manny@`
- [ ] Owner sign-out/in confirmed (Access Denied cleared) — **primary remaining action**
- [ ] Optional: GitHub default branch → `main`
- [ ] Optional: Production managed-solution import confirmation

**Current rollup:** **Post-release Absolute GO.** Hardening mission closed; residual work is owner Entra re-login confirmation and optional hygiene.
