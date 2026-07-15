# Power Apps Build Guide — Executive Command Center

**Audience:** Makers extending `HVCG_ProjectCommandCenter_DEV`  
**Spec:** `src/power-apps/executive/scrHomeExec.md`  
**Formulas:** `src/power-apps/executive/NamedFormulas.executive.fx`  
**Domain:** `docs/executive/ARCHITECTURE.md`

This guide does **not** publish apps, import CRM flows, or change SharePoint deployment engines.

## Prerequisites

1. Dev SharePoint lists exist (Clients, Opportunities, Capital, Finance, Decisions, Risks, etc.).
2. Maker has edit rights on Dev canvas app.
3. User testing as Owner (Manny) or role mapped Owner in `HVCG_TeamMembers`.

## A. Merge formulas (after parent append or manual paste)

1. Open App → Formulas.
2. Append `NamedFormulas.executive.fx` block (do not remove CRM formulas).
3. Confirm `nfIsExecutive` / `nfIsFinanceViewer` still resolve from base file.

## B. Rebuild scrHomeExec

1. Open or create screen `scrHomeExec`.
2. Implement Row A–D per executive screen spec.
3. Wire KPI tiles to `nfExec*` formulas.
4. Build Queue gallery from attention filters (or OnStart `colExecQueue`).
5. OnVisible guard: non-executive → `Navigate(scrHomeOps)`.

## C. Navigation

| From | To |
|------|----|
| Global nav "Executive" | scrHomeExec (`Visible = nfIsExecutive`) |
| Queue client row | scrClientDetail |
| Capital attention | scrCapital |
| Open opportunity (commit strip) | scrOpportunityDetail if CRM screens present |
| btnOpsSwitch | scrHomeOps |

## D. SharePoint views (optional until parent merge)

Import or manually create views from `src/sharepoint/views/executive-views.json` for list UX parity.

## E. Save / publish

Maker only. Share with `HVCG-Role-Owner` (+ Admin). Do not share finance KPI visibility with Contractor groups.

## Acceptance (Maker)

- [ ] Owner lands on scrHomeExec from OnStart  
- [ ] Pipeline / Capital tiles non-blank with demo data  
- [ ] Finance tiles hidden for ProjectManager  
- [ ] Decision queue shows RequiresExecutiveAttention rows  
- [ ] No AI draft galleries on this screen  
