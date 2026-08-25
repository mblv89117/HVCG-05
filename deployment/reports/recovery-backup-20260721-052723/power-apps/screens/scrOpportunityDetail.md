# Screen: Opportunity Detail (scrOpportunityDetail)

**App:** HVCG_ProjectCommandCenter  
**Audience:** Same as scrCRM (edit vs view by `nfCanEditCRM` / Finance viewer rules)  
**Entry:** `Navigate` from scrCRM board/list, Exec/Ops deep links, search

## Purpose

Single-opportunity workspace for High Value Capital Group sellers and capital advisors: commercial facts, lifecycle bridge to capital, activity timeline, proposals, next action, and Copilot grounding fields.

## Context variables

| Variable | Source |
|----------|--------|
| `varSelectedOpportunity` | Required — set before Navigate from galCRM / deep link |
| `varDetailTab` | `"Overview"` \| `"Timeline"` \| `"Proposals"` \| `"Capital"` \| `"Copilot"` |
| `varDetailLoading` | Refresh cycle |
| `varDetailError` | Banner |
| `varShowActivityForm` | Overlay for add activity |
| `varShowProposeForm` | Overlay for new proposal |
| `varConfirmDetail` | Win / Lost / Handoff / Abandon confirms |

OnVisible:

```
If(
  IsBlank(varSelectedOpportunity),
  Navigate(scrCRM, ScreenTransition.None),
  (
    Set(varDetailLoading, true);
    Set(varDetailTab, "Overview");
    Set(varDetailError, Blank());
    Refresh(HVCG_Opportunities);
    Refresh(HVCG_OpportunityActivities);
    Refresh(HVCG_Proposals);
    Refresh(HVCG_DiscoveryCalls);
    // Re-bind selected item from list after refresh
    Set(
      varSelectedOpportunity,
      LookUp(HVCG_Opportunities, ID = varSelectedOpportunity.ID)
    );
    Set(varDetailLoading, false)
  )
);
```

## Data sources

| Source | Filter / use |
|--------|----------------|
| `HVCG_Opportunities` | Selected item (forms Patch target) |
| `HVCG_OpportunityActivities` | `OpportunityId.Id = varSelectedOpportunity.ID` |
| `HVCG_Proposals` | `OpportunityId.Id = varSelectedOpportunity.ID` |
| `HVCG_DiscoveryCalls` | OpportunityId or LeadId match |
| `HVCG_CapitalOpportunities` | Lookup when `CapitalOpportunityId` set |
| `HVCG_Clients` / `HVCG_Leads` | Context cards |
| `HVCG_WinLossAnalyses` | When WinLossStatus ≠ Open |

---

## Layout — desktop

See `src/power-apps/crm/layout-desktop.md` (detail section).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Back to Pipeline | Title | Stage chip | Win/Loss | Owner | Edit lock hint  │
├─ Next-action bar (date + notes + Save) ────────────────────────────────────┤
├─ Tab strip: Overview | Timeline | Proposals | Capital | Copilot ───────────┤
│                                                                            │
│  Main 70%                              │  Side 30%                         │
│  Tab content                           │  Quick actions                    │
│                                        │  Related lead/client cards        │
│                                        │  TeamsThreadUrl                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Header

- `btnBack` → `Navigate(scrCRM)`
- Title (view) / editable Title on Overview form
- Stage dropdown (open stages only unless already Won/Lost)
- WinLossStatus read-only badge (change via Win/Lost actions)
- SalesOwnerEmail
- RequiresExecutiveAttention toggle (Owner/Ops Mgr only)

### Next-action bar (persistent on all tabs)

| Control | Field |
|---------|-------|
| dteNext | `NextActionDate` |
| txtNextNotes | `NextActionNotes` |
| btnSaveNext | Patch; validation: date required if notes non-blank |
| lblOverdue | Visible when open deal and date &lt; Today() |

Empty: placeholder “Set the next follow-up so this deal stays visible on the CRM board.”

### Side rail — quick actions

| Button | Behavior | Visible when |
|--------|----------|--------------|
| Add activity | `varShowActivityForm = true` | `nfCanEditCRM` |
| New proposal | proposal form | `nfCanEditCRM` |
| Mark handoff Ready | confirm → Patch CapitalHandoffStatus=Ready | Capital Raise/Hybrid + edit |
| Open capital book | `Navigate(scrCapital)` | `!IsBlank(CapitalOpportunityId)` |
| Mark Won | confirm dialog | Open + edit |
| Mark Lost | confirm + LostReason | Open + edit |
| Open Teams thread | Launch(`TeamsThreadUrl`) | URL non-blank |
| Flag for exec | Patch RequiresExecutiveAttention | Owner/Ops |

---

## Tab: Overview

### Commercial

| Field | Notes |
|-------|-------|
| ProposalAmount | Currency |
| Probability | 0–100; on change optionally `WeightedValue = nfRecalcWeightedValue(...)` |
| WeightedValue | Shown; editable override allowed for exec |
| ForecastCategory | Pipeline / BestCase / Commit / Omitted / Closed |
| ExpectedCloseDate | Date |
| MRRImpact, SetupFeeImpact, SuccessFeeImpact, ClientLifetimeValueEstimate | **Visible only if `nfIsFinanceViewer`** |

### Lifecycle

| Field | Notes |
|-------|-------|
| LeadId | Link → show lead Title; optional Navigate if lead gallery exists |
| ClientId | Link to scrClientDetail when set |
| OpportunityType | Choice |
| ServicePackage | Text |
| ReferralPartnerId | Display |
| CapitalHandoffStatus | Choice; Ready action preferred over free edit for PM/Advisor |
| CapitalOpportunityId | Read-only lookup text after flow |
| DiscoveryCallId | Link |

### Notes

- `Notes` multiline (internal; not Copilot)
- Do not place secrets here either

---

## Tab: Timeline (activity timeline)

Full gallery `galActivities`:

```
Sort(
  Filter(
    HVCG_OpportunityActivities,
    OpportunityId.Id = varSelectedOpportunity.ID
  ),
  ActivityDate,
  Descending
)
```

### Row template

| Element | Bound |
|---------|-------|
| Date/time | ActivityDate |
| Type chip | ActivityType (Call / Email / Meeting / Note / StageChange / Proposal / Handoff / FundingUpdate / Other) |
| Headline | Title |
| Outcome | Outcome |
| Owner | OwnerEmail |
| Stage delta | PriorStage → NewStage when ActivityType=StageChange |
| Body | Notes (expandable) |

### Add activity form (overlay)

| Field | Required | Default |
|-------|----------|---------|
| Title | Yes | |
| ActivityType | Yes | Note |
| ActivityDate | Yes | Now() |
| Outcome | No | |
| Notes | No | |
| OwnerEmail | No | User().Email |
| CopilotKeywords | No | Optional short tags |

On success: Patch activity; Reset form; close overlay; keep sorted newest first.

### Empty / loading / error

- Empty: “No activity logged. Add a call, email, or note.”
- Loading: skeleton or spinner on gallery
- Error: banner with Retry Refresh

---

## Tab: Proposals

`galProposals` filtered by OpportunityId.

Columns: Title, ProposalStatus, ProposalAmount, SentDate, ExpiryDate, VersionLabel, OwnerEmail, FileLink (Launch).

**New proposal** Patch defaults:

- OpportunityId = selected  
- ClientId = selected.ClientId  
- ProposalStatus = Draft  
- OwnerEmail = User().Email  
- ProposalAmount = opportunity.ProposalAmount  

When first proposal moves to Sent: maker may Patch opportunity `Stage="Proposal"` if Stage in Discovery, Assessment (confirm).

Empty: “No proposals yet.”

---

## Tab: Capital

If `CapitalHandoffStatus = NotApplicable` and type is not Capital Raise/Hybrid:

- Message: “Capital handoff does not apply to this opportunity type.”

If Ready / HandedOff / InFunding / Funded / Declined:

| Display | Source |
|---------|--------|
| Handoff status | Opportunities.CapitalHandoffStatus |
| Capital title / code | LookUp CapitalOpportunities |
| FundingStatus | Capital book |
| TargetAmount / WeightedValue | Capital book |
| btnOpenCapital | Navigate scrCapital |

If type is Capital Raise/Hybrid and NotApplicable:

- CTA **Mark Ready for capital desk** (confirm).

Do **not** create `HVCG_CapitalOpportunities` rows in the app when marking Won — flow `HVCG_OpportunityWonCloseout` owns that.

---

## Tab: Copilot

Grounding fields for Microsoft 365 Copilot (see `docs/crm/COPILOT_OPPORTUNITY.md`).

| Field | Rules |
|-------|-------|
| CopilotSummary | ≤ ~500 characters, factual (stage, next action, dollar intent) |
| CopilotKeywords | Include ClientCode / capital intent / Stage / Commit\|Pipeline |

Banned: TIN/EIN, bank numbers, raw PII dumps, unpublished proposal secrets.

`lblCopilotHint` always visible with authoring rules.  
`btnRefreshSummaryHint`: non-destructive reminder that Stage-change flows may refresh summary — does not call external API from canvas.

---

## Related context cards (side)

1. **Lead** — if LeadId: ContactName, LeadStatus, Email, Phone  
2. **Client** — if ClientId: Title, ClientCode, ClientStage, health  
3. **Discovery** — latest DiscoveryCall Outcome / NextStep  
4. **Win/Loss analysis** — if closed: Result, PrimaryReason, AnalysisDate  

---

## Layout — phone

See `src/power-apps/crm/layout-phone.md`.

- Sticky header: Back + Title + Stage  
- Next-action compact (date + Save)  
- Horizontal tab scroll  
- Quick actions as bottom sheet / overflow menu (⋯)  
- Timeline is default tab after Overview for mobile sellers  

---

## Role-aware access

| Capability | Roles |
|------------|-------|
| View detail | Owner, Admin, OpsMgr, PM, CapitalAdvisor, FinAnalyst, OpsAsst, ReadOnly |
| Edit commercial / stage / activities | Owner, Admin, OpsMgr, PM, CapitalAdvisor, OpsAsst (`nfCanEditCRM`) |
| Edit fee impact fields | `nfIsFinanceViewer` |
| Toggle RequiresExecutiveAttention | Owner, Admin, OpsMgr |
| Mark capital Ready | PM, CapitalAdvisor, Owner, Admin, OpsMgr |
| Contractor | Block OnVisible → Navigate home |

Read-only users: forms `DisplayMode.View`; hide Patch buttons.

---

## Validation

| Rule | Enforcement |
|------|-------------|
| Probability 0–100 | Before Patch |
| LostReason required on Lost | Confirm dialog dropdown required |
| Handoff Ready only Capital Raise / Hybrid | Disable button otherwise |
| Activity Title + Type + Date required | Form |
| CopilotSummary Len ≤ 500 | Soft warn at 450; block save &gt; 500 |
| TeamsThreadUrl if set must start with https:// | Warn |
| Cannot reopen Won/Lost to Open without Owner | Disable Stage reopen for non-Owner |

---

## States

### Loading

Spinner over main region while `varDetailLoading`; disable saves.

### Empty

| Area | Copy |
|------|------|
| Timeline | “No activity logged…” |
| Proposals | “No proposals yet.” |
| Capital link missing after Won | “Waiting for capital automation — tap Refresh.” |

### Error

Banner + Retry; preserve unsaved form buffers in variables (`varDraftNotes`, etc.) when feasible.

### Confirm

| Action | Copy focus |
|--------|------------|
| Won | Mentions capital book automation for raise/hybrid |
| Lost | Requires LostReason |
| Handoff Ready | Notifies capital channel via flow/list listeners |
| Abandon (WinLossStatus=Abandoned) | Owner only; rare path |

---

## Power Fx snippets (Maker paste)

### Save next action

```
If(
  !IsBlank(txtNextNotes.Text) && IsBlank(dteNext.SelectedDate),
  Notify("Set a next-action date when notes are present.", NotificationType.Warning),
  (
    Patch(HVCG_Opportunities, varSelectedOpportunity, {
      NextActionDate: dteNext.SelectedDate,
      NextActionNotes: txtNextNotes.Text
    });
    Notify("Next action saved", NotificationType.Success);
    Set(varSelectedOpportunity, LookUp(HVCG_Opportunities, ID = varSelectedOpportunity.ID))
  )
);
```

### Mark Won (after confirm)

```
Patch(HVCG_Opportunities, varSelectedOpportunity, {
  Stage: "Won",
  WinLossStatus: "Won",
  WonDate: Today(),
  ForecastCategory: "Closed"
});
// Optional StageChange activity row — then Refresh
```

---

## Copilot readiness (screen-level)

- Keep `CopilotSummary` ≤ ~500 characters, factual.
- Keywords should include ClientCode, CapitalType intent, Stage.
- Do not put secrets (TIN, bank) in Copilot fields.
- Prefer updating summary when Stage or CapitalHandoffStatus changes (manual or flow).

## Acceptance

- [ ] Opens only with `varSelectedOpportunity`; else redirects to scrCRM
- [ ] Timeline newest-first; Add activity appears immediately after Patch
- [ ] Next-action bar Patches date/notes and reflects overdue styling
- [ ] Fee fields hidden for non-finance viewers
- [ ] Capital tab respects handoff status; Open capital book when ID present
- [ ] Won/Lost confirms; LostReason required
- [ ] Phone tabs + overflow actions usable without desktop side rail
- [ ] Copilot fields enforce length / no-secret hint
