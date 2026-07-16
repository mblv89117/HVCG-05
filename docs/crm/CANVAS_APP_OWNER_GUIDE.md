# Canvas App — Owner Action Guide (Development)

**Audience:** HVCG owner / Maker (Manny)  
**Environment:** HVCG Development only  
**App target name:** `HVCG_ProjectCommandCenter_DEV`  
**Status:** Package ready for **build/import**. **Publish and activate are blocked until you explicitly approve.**

Related:

| Artifact | Path |
|----------|------|
| Build guide (screen inventory) | `docs/crm/POWER_APPS_BUILD_GUIDE.md` |
| Layouts | `src/power-apps/crm/layout-desktop.md`, `layout-phone.md` |
| Screens | `src/power-apps/screens/scrCRM.md`, `scrOpportunityDetail.md` |
| Formulas | `src/power-apps/formulas/NamedFormulas.fx` |
| Solution export validation | `docs/crm/SOLUTION_EXPORT_VALIDATION.md` |
| General CRM owner stops | `docs/crm/OWNER_ACTION_GUIDE.md` (OA-CRM-09) |

---

## Current Dev state (verified 2026-07-16)

- `pac canvas list` → **no canvas apps** in HVCG Development.
- Solution `HVCGCommandCenterDev` export contains **flows + connection references only** (no CanvasApp component).
- CRM flows are live and smoke-validated; UI is the remaining gap.

---

## Owner decision gate (required)

| Action | Allowed now? |
|--------|----------------|
| Open Maker, create/edit app in **Dev** | Yes (preparation) |
| Save draft app in Dev | Yes |
| Add SharePoint connections / data sources | Yes (your consent) |
| **Publish** app | **No — wait for your approval** |
| **Share** broadly / set as org default | **No — wait for your approval** |
| Add app to solution + export | After publish approval (separate step) |
| Production | **Never in this milestone** |

Reply in chat or agent-comms with: **APPROVE canvas publish (Dev)** when ready.

---

## Package checklist (exact order)

### 1. Prerequisites (confirm before Maker)

1. Dev Command Center site lists exist (CRM lists including `HVCG_OpportunityActivities`).
2. Four CRM flows On in Dev (smoke already PASS).
3. PAC/Maker signed into **HVCG Development** (not Production).
4. Local config: `config/environments/development.json` from `development.example.json` (gitignored).

### 2. Create or open the app (Dev Maker)

1. Open [make.powerapps.com](https://make.powerapps.com).
2. Environment switcher → **HVCG Development**.
3. **Create** → Canvas → Blank app → **Tablet** format.  
   Name: `HVCG_ProjectCommandCenter_DEV`  
   **Or** open that app if it already exists after a prior session.
4. **Do not click Publish** until approved.

### 3. Connect SharePoint data

**Data** → Add data → SharePoint → `HVCG-CommandCenter-Dev` → add:

- `HVCG_Leads`
- `HVCG_Opportunities`
- `HVCG_OpportunityActivities`
- `HVCG_Proposals`
- `HVCG_DiscoveryCalls`
- `HVCG_WinLossAnalyses`
- `HVCG_CapitalOpportunities`
- `HVCG_Clients`
- `HVCG_TeamMembers`
- Optional: `HVCG_ReferralPartners`, `HVCG_Referrals`

Consent the SharePoint connection under your identity when prompted.

### 4. Formulas and OnStart

1. **App → Formulas**: paste / merge from `src/power-apps/formulas/NamedFormulas.fx` (Opportunity CRM section at minimum).
2. **App → OnStart** — append:

```
Set(varCRMScope, If(nfIsCRMExecutiveViewer, "All", "My"));
Set(varSelectedOpportunity, Blank());
Set(varSelectedOpp, Blank());
Set(varSelectedLead, Blank());
```

Keep existing home navigation if present.

### 5. Build screens

Follow in order:

1. `docs/crm/POWER_APPS_BUILD_GUIDE.md` §B (`scrCRM`) and §C (`scrOpportunityDetail`)
2. Control maps: `src/power-apps/screens/scrCRM.md`, `scrOpportunityDetail.md`
3. Layouts: `src/power-apps/crm/layout-desktop.md`, `layout-phone.md`

Save frequently. Stay in **draft**.

### 6. Dev-only smoke in Studio (no publish)

While still unpublished / preview:

1. Qualify a test lead → confirm opportunity appears after ~1–2 minutes (flow recurrence).
2. Open opportunity detail → stage change → activity row appears.
3. Confirm no Teams posts if `hvcg_CrmEnableTeamsNotify` is false.

### 7. After you approve publish (owner only)

1. **Publish** this version in Dev.
2. Share only to the Dev test group / your account (not Production users).
3. Optional later: add Canvas App to `HVCGCommandCenterDev` → re-export → re-run `docs/crm/SOLUTION_EXPORT_VALIDATION.md`.

### 8. Explicit non-actions

- Do not run `pac canvas` publish automation against Production.
- Do not enable client-facing notifications from the app.
- Do not mark CRM fully closed until publish approval + your UI attestation.

---

## Agent-prepared import package (repo)

| Path | Purpose |
|------|---------|
| `docs/crm/POWER_APPS_BUILD_GUIDE.md` | Step-by-step Maker build |
| `src/power-apps/formulas/NamedFormulas.fx` | Named formulas source |
| `src/power-apps/screens/*.md` | Screen control specs |
| `src/power-apps/crm/layout-*.md` | Responsive layout maps |
| `deployment/packages/crm/` | Solution export + validation (flows), not an `.msapp` |

There is **no `.msapp` binary** in repo yet because Maker has not saved one. After you save in Maker, optional: `pac canvas download` into `deployment/packages/crm/canvas/` for repo backup (still Dev-only; publish remains gated).
