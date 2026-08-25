# CRM desktop layout notes

**Screens:** `scrCRM`, `scrOpportunityDetail`  
**Target form factor:** Tablet/desktop canvas (typically 1366×768 design, responsive containers)

## Shared chrome

- Left app nav stays as Command Center global nav (Home, Clients, CRM, Capital, …).
- CRM screens use internal header — do not duplicate global brand block.
- Use container **horizontal/vertical** with flexible width formulas:

```
conLeft.Width = Parent.Width * 0.22
conCenter.Width = Parent.Width * 0.48
conRight.Width = Parent.Width * 0.30
```

When `App.Width < 1200`, switch to stacked layout (see phone notes) via `conDesktop.Visible` / `conPhone.Visible`.

## scrCRM regions

| Region | Min width | Contents |
|--------|-----------|----------|
| Header | full | Title, scope, search, view toggle, refresh, quick lead |
| KPI strip | full | 4–5 equal tiles; wrap to 2 rows if needed |
| Left rail | 260px | Lead galleries + tabs |
| Center | 480px | Kanban columns **or** opportunity data table |
| Right rail | 320px | Selection summary, next-action, timeline preview |
| Footer | full | Aggregates (optional if KPI strip present — prefer KPI only to reduce clutter) |

### Kanban columns

- Four equal columns for open stages; `Height = Parent.Height - header - kpi`.
- Column header = Stage name + `CountRows` badge.
- Cards: white surface, 1px border; **no** floating badges over cards besides Stage/Type chips inside the template.
- Closed strip height ~120px below board (Won/Lost this month).

### Selection behavior

- Selecting a card sets `varSelectedOpp` and keeps user on board (desktop).
- Double-select or “Open” button navigates to detail.
- Clear selection button on right rail when needed.

## scrOpportunityDetail regions

| Region | Width | Contents |
|--------|-------|----------|
| Header + next-action | full | Back, identity, next-action bar |
| Tabs | full | Overview / Timeline / Proposals / Capital / Copilot |
| Main | ~70% | Tab body forms/galleries |
| Side | ~30% | Quick actions, lead/client cards, Teams URL |

Prefer **one purpose per tab**. Do not put proposal galleries on Overview.

## Typography & density

- Follow existing Command Center fonts/theme (do not introduce a new display font stack in Maker unless app theme already defines one).
- Dense galleries OK on CRM (seller workflow); keep ≥44px touch height for primary buttons.
- Stage colors via `nfStageColor` + text label (not color alone).

## Accessibility

- TabIndex order: Header → KPIs → Left → Center → Right → Footer.
- Confirm dialogs trap focus.
- Overdue states include text (“Overdue”), not only red fill.
