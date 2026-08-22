# Screen: CRM Pipeline (scrCRM)

**App:** HVCG_ProjectCommandCenter  
**Audience:** Owner, Administrator, OperationsManager, ProjectManager, CapitalAdvisor (edit); FinancialAnalyst / ReadOnly (view); hide from Contractor  
**Entry:** Nav rail / Ops Home “Pipeline” tile / Exec Home pipeline KPI deep-link

## Purpose

Operate the full HVCG sales funnel on SharePoint lists: **lead intake → qualification → opportunity → proposal → negotiation → win/loss**, with handoff to the capital funding desk when applicable.

Primary jobs on this screen:

1. See pipeline health (dashboard KPIs).
2. Work open leads and open opportunities (list + stage board).
3. Preview the selected deal’s activity timeline and next action without leaving the board.
4. Navigate into `scrOpportunityDetail` for full deal workspace.

## Entities (SharePoint)

| List | Role on this screen |
|------|---------------------|
| `HVCG_Leads` | Left-rail intake / qualify queue |
| `HVCG_ReferralPartners` / `HVCG_Referrals` | Context on lead cards (lookup display) |
| `HVCG_DiscoveryCalls` | Quick-log from lead actions |
| `HVCG_Opportunities` | Kanban + list SOR for `Stage` / forecast |
| `HVCG_OpportunityActivities` | Right-rail / selected timeline preview |
| `HVCG_Proposals` | Quick create from selected opportunity |
| `HVCG_WinLossAnalyses` | Created by flow on Won (display link only) |
| `HVCG_CapitalOpportunities` | Bridge via `CapitalOpportunityId` after handoff/win flow |

## Screen variables

| Variable | Set when | Purpose |
|----------|----------|---------|
| `varCRMView` | OnVisible / toggle | `"Board"` \| `"List"` \| `"Leads"` |
| `varSelectedLead` | galLeads.OnSelect | Context for qualify / discovery |
| `varSelectedOpp` | galKanban / galOppList.OnSelect | Right rail + navigate detail |
| `varCRMScope` | dropdown | `"My"` \| `"Team"` \| `"All"` (role-gated) |
| `varCRMLoading` | Refresh start/end | Spinner overlay |
| `varCRMError` | Patch/Refresh fail | Banner text |
| `varConfirmAction` | before destructive Patch | Dialog payload (`Win`/`Lost`/`Qualify`/`HandoffReady`) |

Default OnVisible:

```
Set(varCRMLoading, true);
Set(varCRMView, "Board");
Set(varCRMScope, If(nfIsCRMExecutiveViewer, "All", "My"));
Set(varSelectedOpp, Blank());
Set(varSelectedLead, Blank());
Set(varCRMError, Blank());
Refresh(HVCG_Leads);
Refresh(HVCG_Opportunities);
Refresh(HVCG_OpportunityActivities);
Set(varCRMLoading, false);
```

---

## Layout — desktop (≥1200 app width)

See also `src/power-apps/crm/layout-desktop.md`.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header: CRM Pipeline | scope | search | view toggle | Quick Create Lead      │
├──────────────────────────────── KPI strip (4–5 tiles) ───────────────────────┤
├─────────────┬──────────────────────────────┬─────────────────────────────────┤
│ Left rail   │ Center                       │ Right rail                      │
│ ~22%        │ ~48%                         │ ~30%                            │
│ Leads queue │ Board OR Opp list            │ Selected deal summary           │
│ + filter    │ Stage columns / table        │ Next-action panel               │
│             │                              │ Activity timeline (last 8)      │
└─────────────┴──────────────────────────────┴─────────────────────────────────┘
│ Footer: Open pipeline $ | Commit forecast $ | Capital handoffs ready | Overdue│
```

### 1. Header

- Title: **CRM Pipeline**
- `ddScope`: My pipeline / Team / All (All visible only if `nfIsCRMExecutiveViewer`)
- `txtSearch`: Title, ContactName, Client lookup text, SalesOwnerEmail
- View toggle: Board | List | Leads focus
- `btnQuickLead`: opens overlay form → Patch `HVCG_Leads` (`LeadStatus=New`, `OwnerEmail=User().Email`)
- `btnRefresh`: Refresh lists; show spinner via `varCRMLoading`

### 2. Dashboard KPI strip

| Tile | Formula concept | OnSelect |
|------|-----------------|----------|
| Open pipeline $ | `nfPipelineWeightedValue` | Set scope All/Open; Board view |
| Commit forecast $ | `nfCommitForecastValue` | Filter board ForecastCategory=Commit |
| Open deals | `CountRows(nfVisiblePipeline)` | List view |
| Capital handoffs ready | `CountRows(nfCapitalHandoffsReady)` | Filter CapitalHandoffStatus in Ready, HandedOff |
| Overdue next actions | `CountRows(nfOverdueNextActions)` | List sorted by NextActionDate |

Tile labels use plain language (“Open pipeline”, not list names). Color is not the sole indicator — include count/value text.

### 3. Left rail — Lead / opportunity intake list

**Primary gallery:** `galLeads` Items = `nfVisibleLeads` (respect scope + search).

Lead card fields:

- Title / ContactName  
- LeadStatus chip (New / Contacted / Qualified)  
- ServiceInterest, EstimatedValue or PipelineValue  
- NextFollowUpDate (overdue styling if past)  
- OwnerEmail (abbreviated)

Secondary tabs on rail:

| Tab | Items |
|-----|-------|
| Open leads | `nfOpenLeads` filtered by scope |
| Qualified | `nfQualifiedLeads` |
| My follow-ups | Leads where OwnerEmail = me && NextFollowUpDate ≤ Today()+7 |

Empty state (rail): “No leads in this view. Create a lead to start intake.”

### 4. Center — Stage pipeline (Board) / Opportunity list

#### Board (`varCRMView = "Board"`)

Horizontal container with columns for **open** stages only:

| Column | Items filter |
|--------|----------------|
| Discovery | `Stage="Discovery" && WinLossStatus="Open"` |
| Assessment | `Stage="Assessment" && WinLossStatus="Open"` |
| Proposal | `Stage="Proposal" && WinLossStatus="Open"` |
| Negotiation | `Stage="Negotiation" && WinLossStatus="Open"` |

Separate compact strip **Closed this month**: Won | Lost (read-only cards; click opens detail).

Card content:

- Title  
- OpportunityType chip  
- WeightedValue + Probability  
- ExpectedCloseDate  
- NextActionDate (amber/red if overdue)  
- CapitalHandoffStatus badge when not NotApplicable  

**Stage change (Maker pattern):**

- Prefer **dropdown on card** or **context menu** (Stage → Patch) over free drag if drag-drop is unreliable on SharePoint.
- Optional: `OnDrop` containers that Patch `Stage` when using experimental DnD.

On Stage patch to Won/Lost → do **not** silent-close; open confirm dialog (see States).

After successful open-stage Patch → create activity:

```
Patch(HVCG_OpportunityActivities, Defaults(HVCG_OpportunityActivities), {
  Title: "Stage → " & newStage,
  OpportunityId: ThisItem,
  ActivityType: "StageChange",
  ActivityDate: Now(),
  OwnerEmail: User().Email,
  PriorStage: oldStage,
  NewStage: newStage
})
```

Flows `HVCG_OpportunityStageChangedNotify` / `HVCG_OpportunityWonCloseout` handle Teams + WinLoss + capital create — UI must not duplicate capital row creation.

#### List (`varCRMView = "List"`)

`galOppList` columns:

| Column | Field |
|--------|-------|
| Title | Title |
| Stage | Stage |
| Type | OpportunityType |
| Owner | SalesOwnerEmail |
| Amount | ProposalAmount / WeightedValue |
| Forecast | ForecastCategory |
| Close | ExpectedCloseDate |
| Next action | NextActionDate |
| Handoff | CapitalHandoffStatus |

Sort default: NextActionDate ascending (blank last). Multi-select not required for MVP.

### 5. Right rail — Selected opportunity + next action + timeline

Visible when `!IsBlank(varSelectedOpp)`.

#### Summary header

- Title, Stage, WinLossStatus  
- SalesOwnerEmail  
- OpportunityType  
- ProposalAmount, Probability, WeightedValue (fee impacts if `nfIsFinanceViewer`)  
- `btnOpenDetail` →  

```
Set(varSelectedOpportunity, varSelectedOpp);
Navigate(scrOpportunityDetail, ScreenTransition.Fade);
```

#### Next-action panel

| Control | Bound to |
|---------|----------|
| Date | `NextActionDate` |
| Notes | `NextActionNotes` (multi-line, 3 lines) |
| Save | Patch opportunity; toast “Next action saved” |
| Mark done | Clear date/notes OR set date = Today()+7 with prompt |

Overdue: red label “Overdue by N days” using `DateDiff(NextActionDate, Today(), Days)` when date &lt; Today() and WinLossStatus=Open.

Empty next-action: “No next action set — add a date so this deal stays on the radar.”

#### Activity timeline preview

`galTimelinePreview` Items:

```
FirstN(
  Sort(
    Filter(HVCG_OpportunityActivities, OpportunityId.Id = varSelectedOpp.ID),
    ActivityDate,
    Descending
  ),
  8
)
```

Row: ActivityDate | ActivityType icon | Title | Outcome (1 line).  
Footer link: “View all on detail →” navigates to detail with timeline focused.

Empty: “No activities yet. Log a call or note from the detail screen.”

### 6. Footer KPIs (always visible on desktop)

Reuse named formulas; values update when scope filter changes (`nfVisiblePipeline`).

---

## Layout — phone / narrow (&lt;768 app width)

See `src/power-apps/crm/layout-phone.md`.

- Single column; hide tri-pane.
- Top: KPI horizontal scroll (2 tiles visible).
- Segmented control: **Leads | Board | Deals | Next actions**.
- Board: vertical accordion (one stage expanded) or dropdown “Stage column” + gallery.
- Selecting a deal navigates to `scrOpportunityDetail` (no persistent right rail).
- Next-actions segment: `galOverdueNext` = `nfOverdueNextActions` + upcoming 7 days.
- Quick Create Lead stays as FAB / header button.

---

## Actions

| Action | Behavior | Confirm? |
|--------|----------|----------|
| Quick Create Lead | Form → `HVCG_Leads` (`LeadStatus=New`) | No |
| Qualify lead | Patch `LeadStatus=Qualified` → flow `HVCG_LeadQualifiedCreateOpportunity` creates Opportunity | Yes |
| Contacted | Patch `LeadStatus=Contacted` | No |
| Disqualify | Patch Disqualified + LossReason | Yes + reason required |
| Log discovery | Create `HVCG_DiscoveryCalls` + activity on lead/opp | No |
| Create proposal | Create `HVCG_Proposals` linked to OpportunityId; Patch Stage=Proposal if currently Discovery/Assessment | Soft confirm if jumping stages |
| Mark Ready for capital | Patch `CapitalHandoffStatus=Ready` (Capital Raise / Hybrid only) | Yes |
| Win | Patch Stage=Won, WinLossStatus=Won, WonDate=Today(), ForecastCategory=Closed | Yes |
| Lost | Patch Stage=Lost, WinLossStatus=Lost, LostDate, LostReason required | Yes |
| Open detail | Navigate scrOpportunityDetail | No |

**Win / Lost UI rules**

- Won/Lost: set `ForecastCategory="Closed"`.
- Lost: `LostReason` required before Patch.
- After Won on Capital Raise / Hybrid: show info banner “Capital book will appear after automation completes — refresh in ~30s” (do not Patch CapitalOpportunities from app).

---

## Role-aware access

| Role (`nfUserRole`) | Scope default | Edit leads/opps | Fee fields (MRR/Setup/Success) | Capital handoff Ready | See All scope |
|---------------------|---------------|-----------------|--------------------------------|----------------------|---------------|
| Owner / Administrator / OperationsManager | All | Yes | Yes (`nfIsFinanceViewer`) | Yes | Yes |
| ProjectManager / CapitalAdvisor | My | Yes (own + shared) | No | Yes (Capital Raise/Hybrid) | No (unless elevated) |
| FinancialAnalyst | All | Read-only forms | Yes (view) | No | Yes |
| OperationsAssistant | My | Yes (intake/qualify) | No | No | No |
| Contractor / Client Contact | — | Screen hidden / Navigate away | — | — | — |

Formulas: `nfCanEditCRM`, `nfIsCRMExecutiveViewer`, `nfVisiblePipeline`, `nfVisibleLeads` in `NamedFormulas.fx`.

DisplayMode for edit buttons:

```
If(nfCanEditCRM, DisplayMode.Edit, DisplayMode.View)
```

---

## Validation

| Rule | When |
|------|------|
| Title required | Create lead / opportunity |
| LeadStatus Qualified only if ContactName or Email present | Qualify |
| LostReason required | Mark Lost |
| Probability 0–100 | Patch Probability |
| WeightedValue = ProposalAmount * Probability/100 (optional auto on change) | Commercial edits |
| CapitalHandoffStatus Ready only if OpportunityType in Capital Raise, Hybrid | Mark Ready |
| NextActionNotes max practical length ~2000 | Save next action |
| Copilot fields not edited on this screen | Detail only |

Show inline label `lblValidation` in red above submit; keep Patch behind validation pass.

---

## States

### Loading

- Full-screen or center spinner while `varCRMLoading`.
- Disable Patch buttons during load.

### Empty

| Context | Message | CTA |
|---------|---------|-----|
| No open opportunities | “Pipeline is clear — qualify a lead or create an opportunity.” | Qualify / Quick lead |
| No leads | “No open leads.” | Quick Create Lead |
| No search hits | “No deals match your search.” | Clear search |
| No timeline | See right-rail empty copy | Open detail → Add activity |

### Error

- Banner `varCRMError` with Retry (Refresh) and Dismiss.
- On Patch failure: “Couldn’t save. Check connection and try again.” Keep form values.

### Confirm dialogs (`conConfirmCRM`)

| Action | Title | Body |
|--------|-------|------|
| Qualify | Qualify this lead? | Creates an opportunity via automation. Continue? |
| Win | Mark as won? | Closes the deal and may create a capital book. This cannot be undone from the board. |
| Lost | Mark as lost? | Requires a lost reason. Win/loss analysis may follow. |
| Handoff Ready | Ready for capital desk? | Notifies capital advisors that diligence can start. |

Primary button performs Patch; Cancel closes dialog.

---

## Named formulas

See `NamedFormulas.fx`:

`nfOpenPipeline`, `nfMyOpportunities`, `nfVisiblePipeline`, `nfQualifiedLeads`, `nfOpenLeads`, `nfVisibleLeads`, `nfCapitalHandoffsReady`, `nfPipelineWeightedValue`, `nfCommitForecastValue`, `nfOverdueNextActions`, `nfCanEditCRM`, `nfIsCRMExecutiveViewer`, `nfStageColor`, `nfRecalcWeightedValue`.

---

## Navigation

| From | To |
|------|----|
| Card / Open detail | `scrOpportunityDetail` |
| Capital badge when CapitalOpportunityId set | `scrCapital` (optional with `varSelectedCapital`) |
| Header home | `scrHomeOps` / `scrHomeExec` by role |
| Quick Create advanced | `scrQuickCreate` mode Lead / Opportunity if present |

---

## Acceptance

- [ ] KPI strip shows live Sum WeightedValue for open deals in current scope
- [ ] Board columns only show `WinLossStatus=Open` for Discovery–Negotiation
- [ ] List and Board stay in sync after Stage Patch
- [ ] Qualify lead shows confirm; after flow, new opportunity appears on refresh
- [ ] Activity timeline preview newest-first (max 8)
- [ ] Next-action panel Patches `NextActionDate` / `NextActionNotes`
- [ ] Finance fee fields hidden unless `nfIsFinanceViewer`
- [ ] Phone: Board/List/Leads usable without horizontal tri-pane
- [ ] Contractor cannot open screen (guard on OnVisible)
- [ ] Won Capital Raise shows linked `CapitalOpportunityId` after flow + Refresh
- [ ] `TeamsThreadUrl` editable on detail (not required on board)
