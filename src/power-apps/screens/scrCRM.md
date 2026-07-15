# Screen: CRM Pipeline (scrCRM)

## Purpose

Operate the full HVCG sales funnel on SharePoint lists: **lead intake → qualification → opportunity → proposal → negotiation → win/loss**, with handoff to the capital funding desk when applicable.

## Entities (SharePoint)

| List | Role |
|------|------|
| `HVCG_Leads` | Intake |
| `HVCG_ReferralPartners` / `HVCG_Referrals` | Channel |
| `HVCG_DiscoveryCalls` | Qualification notes |
| `HVCG_Opportunities` | Pipeline (SOR for Stage / forecast) |
| `HVCG_OpportunityActivities` | Timeline |
| `HVCG_Proposals` | Commercial offers |
| `HVCG_WinLossAnalyses` | Closed-deal learning |
| `HVCG_CapitalOpportunities` | Funding desk (via bridge) |

## Layout

1. **Left rail** — Open Leads / Qualified Leads (gallery).
2. **Center** — Opportunity kanban by `Stage`: Discovery → Assessment → Proposal → Negotiation → Won | Lost.
3. **Right rail** — Selected opportunity detail + activity timeline (`HVCG_OpportunityActivities`).
4. **Footer KPIs** — Open pipeline $ (`SUM WeightedValue`), Commit forecast $, capital handoffs ready count.

## Kanban / stage board

- Drag/patch `Stage` on `HVCG_Opportunities`.
- On drop to Won/Lost, patch `WinLossStatus`, `WonDate`/`LostDate`, `ForecastCategory=Closed`.
- Flows also enforce Won closeout / Teams notify (do not duplicate capital create in UI if flow succeeds).

## Actions

| Action | Behavior |
|--------|----------|
| Quick Create Lead | Form → `HVCG_Leads` (`LeadStatus=New`) |
| Qualify lead | Patch `LeadStatus=Qualified` → flow creates Opportunity |
| Log discovery | Create `HVCG_DiscoveryCalls` + activity row |
| Create proposal | Create `HVCG_Proposals` linked to OpportunityId; set Stage=Proposal |
| Mark Ready for capital | Patch `CapitalHandoffStatus=Ready` (Capital Raise / Hybrid) |
| Win | Patch Stage/WinLossStatus Won → flow creates WinLoss + optional CapitalOpportunity |
| Lost | Patch Lost + LostReason + activity |

## Role visibility

- SalesOwnerEmail filter for PMs / Capital Advisors (“My pipeline”).
- Executives see all Open Pipeline + Capital Handoffs Ready.
- Finance can see ProposalAmount / fee impact fields (`nfIsFinanceViewer`).

## Named formulas

See `NamedFormulas.fx`: `nfOpenPipeline`, `nfQualifiedLeads`, `nfCapitalHandoffsReady`, `nfMyOpportunities`.

## Acceptance

- [ ] Kanban filters `WinLossStatus=Open` for open columns
- [ ] Activity timeline shows newest first
- [ ] Capital Raise win shows linked CapitalOpportunityId after flow
- [ ] Teams deep link field `TeamsThreadUrl` editable for deal war-room
