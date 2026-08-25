# CRM phone layout notes

**Screens:** `scrCRM`, `scrOpportunityDetail`  
**Target:** Phone form factor / narrow browser (`App.Width < 768` or dedicated phone screen variants)

## Principles

- One column; no sticky tri-pane.
- Prefer navigate-to-detail over in-place right rail.
- Primary seller jobs: **next actions**, **qualify lead**, **log activity**, **move stage**.

## scrCRM — phone

```
┌─────────────────────┐
│ CRM | ⋮ refresh     │
│ [KPI][KPI] → scroll │
│ Leads|Board|Deals|Next │
│                     │
│ (segment body)      │
│                     │
│ [ + Lead ]          │
└─────────────────────┘
```

| Segment | UI |
|---------|-----|
| Leads | Full-width `galLeads`; swipe actions optional; Qualify in overflow |
| Board | Dropdown “Stage” + vertical gallery for that column |
| Deals | Compact list (Title, Stage, NextActionDate, WeightedValue) |
| Next | Overdue + next 7 days from `nfOverdueNextActions` / upcoming filter |

Selecting any opportunity → set `varSelectedOpportunity` → `Navigate(scrOpportunityDetail)`.

Hide fee figures unless `nfIsFinanceViewer`.

## scrOpportunityDetail — phone

```
┌─────────────────────┐
│ ← Title        [⋯]  │
│ Stage | Owner       │
│ Next action | Save  │
│ Tabs →              │
│ (tab body)          │
└─────────────────────┘
```

- **⋯ overflow:** Add activity, New proposal, Won, Lost, Handoff Ready, Open capital, Teams.
- Default tab after open: **Overview**; sellers often switch to **Timeline** next.
- Forms use full width; group commercial fields in a scrollable vertical container.
- Copilot tab last.

## Touch

- Minimum 44×44 hit targets for stage chips and FAB.
- Confirm sheets use large primary/secondary buttons at bottom.
- Avoid hover-only tooltips; use short helper labels under fields.

## Offline / slow

- On visible Refresh failure: keep last selected item; show “Showing cached selection — reconnect to refresh.”
- Do not queue Patches offline in MVP (Notify to retry).

## Acceptance (phone)

- [ ] All CRM actions reachable without desktop right rail
- [ ] Board usable via stage dropdown
- [ ] Next-actions segment surfaces overdue deals first
- [ ] Detail overflow contains Win/Lost/Handoff
