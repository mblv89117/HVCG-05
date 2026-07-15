# Canvas App Build Sheet — HVCG_ProjectCommandCenter (DEV)

Build this **after** `Deploy-HVCGDevelopment.ps1` has provisioned lists (including Opportunity CRM additive schema).

## Exact build steps (≈45–90 minutes + CRM ~30–45 minutes)

1. Go to https://make.powerapps.com → correct **Dev** environment.
2. **Create app** → Blank canvas → Tablet.
3. Name: `HVCG_ProjectCommandCenter_DEV`.
4. **Data** → Add SharePoint → select `HVCG-CommandCenter-Dev` → add all `HVCG_*` lists (must include `HVCG_Opportunities`, `HVCG_OpportunityActivities`, `HVCG_Leads`, `HVCG_Proposals`, `HVCG_DiscoveryCalls`, `HVCG_CapitalOpportunities`, `HVCG_WinLossAnalyses`).
5. Create screens from `src/power-apps/screens/`:
   - scrHomeOps
   - scrHomeExec
   - **scrCRM** / **scrOpportunityDetail** (Opportunity CRM module — see below)
   - scrCapital
   - scrClientDetail
   - (+ Clients, Projects, MyTasks, DocRequests, Deliverables, Meetings, Registers, Finance, QuickCreate — follow `src/power-apps/README.md`)
6. Paste named formulas from `src/power-apps/formulas/NamedFormulas.fx` into **App → Formulas** (includes CRM: `nfOpenPipeline`, `nfVisiblePipeline`, `nfQualifiedLeads`, `nfCapitalHandoffsReady`, `nfOverdueNextActions`, `nfCanEditCRM`, …).
7. OnStart: set role-based navigate (Owner → Exec, else Ops). Initialize `varCRMScope`, `varSelectedOpportunity` as Blank.
8. Hide finance controls unless role in Owner/Administrator/OperationsManager (`nfIsFinanceViewer`).
9. Wire CRM nav + behavior per `docs/crm/POWER_APPS_BUILD_GUIDE.md`.
10. **File → Save → Publish** (Maker/owner only — do not publish from this repo agent).
11. **Share** with Entra groups `HVCG-DEV-Role-Owner`, `Administrator`, `OperationsManager`, `ProjectManager`, `FinancialAnalyst`, `OperationsAssistant`, `CapitalAdvisor`.

## Opportunity CRM screens (Maker checklist)

Follow the detailed guide: **`docs/crm/POWER_APPS_BUILD_GUIDE.md`**.

| Screen | Spec | Layout notes |
|--------|------|--------------|
| scrCRM | `src/power-apps/screens/scrCRM.md` | `src/power-apps/crm/layout-desktop.md`, `layout-phone.md` |
| scrOpportunityDetail | `src/power-apps/screens/scrOpportunityDetail.md` | same |

Minimum controls on **scrCRM**:

- [ ] KPI tiles bound to `nfPipelineWeightedValue`, `nfCommitForecastValue`, `nfOpenDealCount`, `CountRows(nfCapitalHandoffsReady)`, `CountRows(nfOverdueNextActions)`
- [ ] Lead gallery (`nfVisibleLeads`) + Qualify confirm → Patch LeadStatus=Qualified
- [ ] Stage board (Discovery→Negotiation) filtered `WinLossStatus=Open` from `nfVisiblePipeline`
- [ ] Opportunity list alternate view
- [ ] Right rail: next-action Patch + activity preview (`FirstN` newest activities)
- [ ] Navigate to scrOpportunityDetail with `varSelectedOpportunity`
- [ ] Phone containers visible when `App.Width < 768`

Minimum controls on **scrOpportunityDetail**:

- [ ] OnVisible guard if Blank selection → scrCRM
- [ ] Next-action bar (NextActionDate / NextActionNotes)
- [ ] Tabs: Overview, Timeline, Proposals, Capital, Copilot
- [ ] Add activity → `HVCG_OpportunityActivities`
- [ ] Won/Lost confirms; LostReason required
- [ ] Capital Ready + Open capital book when ID present
- [ ] Fee fields visible only if `nfIsFinanceViewer`

## Acceptance criteria

- [ ] Ops home shows overdue / missing critical doc counts from sample data
- [ ] Executive home shows HVD01 decision when RequiresExecutiveAttention
- [ ] CRM kanban shows open opportunities; detail screen shows activity timeline
- [ ] CRM next-action panel saves and overdue tiles count correctly
- [ ] Qualify lead confirm works; refresh shows new opportunity after flow
- [ ] Analyst cannot edit retainer / fee impact fields (`nfIsFinanceViewer` false)
- [ ] Phone layout usable for My Tasks **and** CRM Board/Next segments
- [ ] Search finds ClientCode `SRM01`
- [ ] Contractor OnVisible redirects away from CRM screens

## After first publish

```powershell
pac canvas export --name HVCG_ProjectCommandCenter_DEV --directory src/power-apps/exports
```

Commit exported sources (no secrets) for future rebuilds.
