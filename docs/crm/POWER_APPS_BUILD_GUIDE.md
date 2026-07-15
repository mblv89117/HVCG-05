# Power Apps Build Guide — Opportunity CRM

**Audience:** Makers rebuilding or extending `HVCG_ProjectCommandCenter`  
**Specs:** `src/power-apps/screens/scrCRM.md`, `scrOpportunityDetail.md`  
**Formulas:** `src/power-apps/formulas/NamedFormulas.fx` (CRM block)  
**Layouts:** `src/power-apps/crm/layout-desktop.md`, `layout-phone.md`  
**Domain:** `docs/crm/OPPORTUNITY_MANAGEMENT.md`

This guide is **import/rebuild instructions**. It does not publish apps or change SharePoint/Automate.

---

## Prerequisites

1. Dev site lists exist (including CRM additive columns / `HVCG_OpportunityActivities`).
2. Flows for qualify / stage / win exist in the environment (UI still works if flows are delayed — refresh after ~30s).
3. Maker has Power Apps create rights on the Dev environment.
4. SharePoint connection to `HVCG-CommandCenter-Dev`.

---

## A. Create or open the canvas app

1. Open [make.powerapps.com](https://make.powerapps.com) → **Dev** environment.
2. Open `HVCG_ProjectCommandCenter_DEV` **or** create Blank canvas (Tablet) with that name.
3. **Data** → add lists:

   - `HVCG_Leads`
   - `HVCG_Opportunities`
   - `HVCG_OpportunityActivities`
   - `HVCG_Proposals`
   - `HVCG_DiscoveryCalls`
   - `HVCG_WinLossAnalyses`
   - `HVCG_CapitalOpportunities`
   - `HVCG_Clients`
   - `HVCG_ReferralPartners` / `HVCG_Referrals` (optional cards)
   - `HVCG_TeamMembers` (role lookup)

4. **App → Formulas**: paste the full `NamedFormulas.fx` content (or merge the `// --- Opportunity CRM ---` section if base formulas already exist).

5. **App → OnStart** (append):

```
Set(varCRMScope, If(nfIsCRMExecutiveViewer, "All", "My"));
Set(varSelectedOpportunity, Blank());
Set(varSelectedOpp, Blank());
Set(varSelectedLead, Blank());
```

Keep existing Owner → `scrHomeExec` / else `scrHomeOps` navigation.

---

## B. Build scrCRM

1. Insert screen → rename `scrCRM`.
2. Add **desktop** and **phone** root containers; `Visible` = `App.Width >= 768` / `App.Width < 768`.
3. Follow region map in `layout-desktop.md` / `layout-phone.md` and control inventory in `scrCRM.md`.

### B1. Variables on OnVisible

Copy the OnVisible block from `scrCRM.md` (Refresh lists, defaults, loading flag).

### B2. KPI strip

Bind labels:

| Tile | Text |
|------|------|
| Open pipeline | `Text(nfPipelineWeightedValue, "$#,##0")` |
| Commit | `Text(nfCommitForecastValue, "$#,##0")` |
| Open deals | `nfOpenDealCount` |
| Capital ready | `CountRows(nfCapitalHandoffsReady)` |
| Overdue next | `CountRows(nfOverdueNextActions)` |

### B3. Leads gallery

- Items: `nfVisibleLeads` (depends on `varCRMScope`).
- OnSelect: `Set(varSelectedLead, ThisItem)`.
- Qualify button → confirm dialog →  
  `Patch(HVCG_Leads, varSelectedLead, { LeadStatus: "Qualified" })`  
  then Notify to refresh after flow creates opportunity.

### B4. Stage board

For each open stage column, gallery Items example:

```
Filter(nfVisiblePipeline, Stage = "Discovery")
```

Stage change: dropdown `OnChange` → Patch `Stage` → Patch StageChange activity row (see scrCRM.md) → Refresh.

Won/Lost: open `conConfirmCRM` instead of immediate Patch.

### B5. Right rail

- Show when `!IsBlank(varSelectedOpp)`.
- Next-action inputs → Patch `NextActionDate`, `NextActionNotes`.
- Timeline: `FirstN(Sort(Filter(HVCG_OpportunityActivities, OpportunityId.Id = varSelectedOpp.ID), ActivityDate, Descending), 8)`.
- **Open** → `Set(varSelectedOpportunity, varSelectedOpp); Navigate(scrOpportunityDetail)`.

### B6. Role guards

- Screen OnVisible: if role is Contractor (or `!` allowed CRM roles), `Navigate(scrHomeOps)`.
- Edit controls: `DisplayMode` = `If(nfCanEditCRM, DisplayMode.Edit, DisplayMode.Disabled)`.
- Fee labels: `Visible = nfIsFinanceViewer`.
- Scope “All”: `Visible = nfIsCRMExecutiveViewer`.

### B7. Nav entry points

- Add **CRM** to global nav → `Navigate(scrCRM)`.
- Ops Home optional tile: open deals / overdue next actions count.
- Exec Home pipeline KPI → `Navigate(scrCRM)`.

---

## C. Build scrOpportunityDetail

1. Insert screen → rename `scrOpportunityDetail`.
2. OnVisible: Blank guard + Refresh + re-LookUp selected row (see spec).
3. Build header, next-action bar, tab strip, side quick actions.
4. Wire tabs per `scrOpportunityDetail.md`.

### C1. Timeline

Gallery Items: `nfActivitiesForSelectedOpp` (uses `varSelectedOpportunity`).

Add activity form → Patch `Defaults(HVCG_OpportunityActivities)` with OpportunityId, ActivityType, ActivityDate, Title, OwnerEmail.

### C2. Win / Lost

Confirm dialogs → Patch Stage + WinLossStatus + dates + ForecastCategory=Closed.  
Lost requires `LostReason`.  
Do **not** create capital rows in the app.

### C3. Capital tab

- Ready button when `nfIsCapitalEligibleType(OpportunityType)` and status NotApplicable.
- Open capital when `!IsBlank(CapitalOpportunityId)` → `Navigate(scrCapital)`.

### C4. Copilot tab

Bind `CopilotSummary` / `CopilotKeywords`; enforce Len ≤ 500; show banned-content hint.

---

## D. Responsive smoke test

| Step | Desktop | Phone |
|------|---------|-------|
| Open scrCRM | Tri-pane visible | Segments visible |
| Select deal | Right rail fills | Navigates to detail |
| Save next action | Persists after Refresh | Same |
| Move stage | Column membership updates | Dropdown stage works |
| Add activity | Appears on detail timeline | Same |
| FinAnalyst | Cannot edit; can see fees if granted by `nfIsFinanceViewer` policy | Same |

Note: Current `nfIsFinanceViewer` is Owner/Admin/OpsMgr only — align fee visibility with `PERMISSIONS_MATRIX.md` (analysts R on CRM commercial as needed by setting Visible to `nfIsFinanceViewer || nfUserRole = "FinancialAnalyst"` if product owner wants analyst fee read).

---

## E. Validation & states checklist

Implement banners/dialogs from screen specs:

- Loading spinners on Refresh
- Empty copies for no leads / no opps / no activities
- Error banner + Retry
- Confirm for Qualify, Win, Lost, Handoff Ready

---

## F. What not to do in Maker

- Do not edit SharePoint list schemas from the app designer.
- Do not invent new Stage / LeadStatus values — use list choices only.
- Do not Patch `HVCG_CapitalOpportunities` on Won (flow owns create).
- Do not publish to Production from a personal Dev copy without owner change control.
- Do not store secrets in CopilotSummary / Notes shown to Copilot.

---

## G. Export (optional, after owner publish)

```powershell
pac canvas export --name HVCG_ProjectCommandCenter_DEV --directory src/power-apps/exports
```

Commit export without environment connection secrets.

---

## H. Acceptance (CRM module)

- [ ] Dashboard KPIs match filtered scope
- [ ] Lead list + qualify path documented and clickable
- [ ] Opportunity board + list both work
- [ ] Detail: timeline, proposals, capital, Copilot, next-action
- [ ] Role-aware edit/view + fee field hiding
- [ ] Loading / empty / error / confirm covered
- [ ] Desktop + phone layouts per `src/power-apps/crm/`

## Related docs

- `docs/crm/OPPORTUNITY_MANAGEMENT.md` — lifecycle & flows  
- `docs/crm/COPILOT_OPPORTUNITY.md` — grounding rules  
- `src/power-apps/BUILD_SHEET.md` — full app build sheet  
- `PERMISSIONS_MATRIX.md` — who can edit CRM lists  
