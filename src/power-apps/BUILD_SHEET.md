# Canvas App Build Sheet — HVCG_ProjectCommandCenter (DEV)

Build this **after** `Deploy-HVCGDevelopment.ps1` has provisioned lists.

## Exact build steps (≈45–90 minutes)

1. Go to https://make.powerapps.com → correct **Dev** environment.
2. **Create app** → Blank canvas → Tablet.
3. Name: `HVCG_ProjectCommandCenter_DEV`.
4. **Data** → Add SharePoint → select `HVCG-CommandCenter-Dev` → add all `HVCG_*` lists.
5. Create screens from `src/power-apps/screens/`:
   - scrHomeOps
   - scrHomeExec
   - scrCRM / scrOpportunityDetail (Opportunity CRM module)
   - scrCapital
   - scrClientDetail
   - (+ Clients, Projects, MyTasks, DocRequests, Deliverables, Meetings, Registers, Finance, QuickCreate — follow `src/power-apps/README.md`)
6. Paste named formulas from `src/power-apps/formulas/NamedFormulas.fx` into App formulas / OnStart as applicable (includes `nfOpenPipeline`, `nfQualifiedLeads`, `nfCapitalHandoffsReady`).
7. OnStart: set role-based navigate (Owner → Exec, else Ops).
8. Hide finance controls unless role in Owner/Administrator/OperationsManager.
9. **File → Save → Publish**.
10. **Share** with Entra groups `HVCG-DEV-Role-Owner`, `Administrator`, `OperationsManager`, `ProjectManager`, `FinancialAnalyst`, `OperationsAssistant`, `CapitalAdvisor`.

## Acceptance criteria

- [ ] Ops home shows overdue / missing critical doc counts from sample data
- [ ] Executive home shows HVD01 decision when RequiresExecutiveAttention
- [ ] CRM kanban shows open opportunities; detail screen shows activity timeline
- [ ] Analyst cannot edit retainer fields
- [ ] Phone layout usable for My Tasks
- [ ] Search finds ClientCode `SRM01`

## After first publish

```powershell
pac canvas export --name HVCG_ProjectCommandCenter_DEV --directory src/power-apps/exports
```

Commit exported sources (no secrets) for future rebuilds.
