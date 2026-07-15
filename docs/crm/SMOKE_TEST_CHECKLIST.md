# Opportunity CRM — Development smoke-test checklist

**Environment:** Development (Command Center)  
**When:** After the owner applies the Opportunity CRM additive schema (idempotent repair).  
**Offline gates:** See `scripts/Test-HVCGOpportunityCrmAcceptance.ps1 -Offline` (must PASS before live smoke).

## Prerequisites (owner)

- [ ] Ran repair / schema apply for migration `20260715_001_opportunity_crm_module` against Development  
- [ ] Confirmed list `HVCG_OpportunityActivities` exists  
- [ ] Confirmed Opportunities has `CapitalOpportunityId`, `CapitalHandoffStatus`, `NextActionDate`, `TeamsThreadUrl`, `CopilotSummary`  
- [ ] Confirmed CapitalOpportunities has `OpportunityId`, `HandoffSource`  
- [ ] CRM flows imported / connections authorized (SharePoint + Teams)  
- [ ] Env vars set: `HVCG_TEAMS_CRM_CHANNEL_ID`, `HVCG_TEAMS_CAPITAL_CHANNEL_ID`  
- [ ] Canvas app screens `scrCRM` / `scrOpportunityDetail` published (or SharePoint views used as interim)

## 1. Lead → opportunity (qualify)

| # | Step | Expected |
|---|------|----------|
| 1.1 | Create or open a lead; set `LeadStatus = Qualified` | Item saves without error |
| 1.2 | Wait for `HVCG_LeadQualifiedCreateOpportunity` | Discovery-stage opportunity created (`WinLossStatus=Open`) |
| 1.3 | Check lead | `ConvertedOpportunityId` points at new opportunity |
| 1.4 | Check `HVCG_OpportunityActivities` | StageChange activity: lead → Discovery |
| 1.5 | Check Teams CRM channel | Post about qualified lead / new opportunity |
| 1.6 | Re-save lead Qualified (no change) | Idempotent — no duplicate opportunity (`HVCG_IdempotencyKey`) |

## 2. Stage path + Teams notify

| # | Step | Expected |
|---|------|----------|
| 2.1 | Move Stage: Discovery → Assessment → Proposal | Activity rows for each StageChange |
| 2.2 | Move to Proposal or Negotiation | Teams CRM channel notified |
| 2.3 | Set `NextActionDate` + `CopilotSummary` | Values persist; visible on detail screen / list |
| 2.4 | Optional: set `TeamsThreadUrl` | Deal war-room link editable |

## 3. Proposal + forecast

| # | Step | Expected |
|---|------|----------|
| 3.1 | Create `HVCG_Proposals` linked to OpportunityId | Proposal appears on opportunity detail |
| 3.2 | Set `ForecastCategory = Commit` on an open opp | Appears in Commit Forecast view / `nfCommitForecastValue` |

## 4. Win closeout (non-capital)

| # | Step | Expected |
|---|------|----------|
| 4.1 | On a Retainer / Advisory opp: set Stage/WinLossStatus = Won | `HVCG_OpportunityWonCloseout` runs |
| 4.2 | Check opportunity | `WonDate`, `ForecastCategory=Closed`, Probability 100 |
| 4.3 | Check `HVCG_WinLossAnalyses` | Stub Result=Won |
| 4.4 | Check Teams | Win message posted |
| 4.5 | Capital handoff | Remains NotApplicable (no capital book created) |

## 5. Win + capital handoff

| # | Step | Expected |
|---|------|----------|
| 5.1 | On Capital Raise or Hybrid opp: Stage=Won (or handoff Ready then Won) | Flow creates/links `HVCG_CapitalOpportunities` |
| 5.2 | Check opportunity | `CapitalOpportunityId` set; `CapitalHandoffStatus=HandedOff` |
| 5.3 | Check capital book | `OpportunityId` reverse link; `HandoffSource=SalesWin`; FundingStatus Identified |
| 5.4 | Check activities | Handoff activity present |
| 5.5 | Funding milestones | Default milestone stubs created (when flow enabled) |

## 6. Funding status bridge

| # | Step | Expected |
|---|------|----------|
| 6.1 | On linked capital item: FundingStatus → Term Sheet or Due Diligence | Sales opp `CapitalHandoffStatus=InFunding` |
| 6.2 | FundingStatus → Closed | Sales opp `CapitalHandoffStatus=Funded` |
| 6.3 | Alt: FundingStatus → Declined | Sales opp `CapitalHandoffStatus=Declined` |
| 6.4 | Teams capital channel | Posts on Term Sheet / Due Diligence / Committed / Closed / Declined |

## 7. Views, formulas, permissions (spot-check)

| # | Step | Expected |
|---|------|----------|
| 7.1 | Views: Open Leads, Qualified Leads, Open Pipeline, Commit Forecast, Capital Handoffs Ready, Recent Activities | Each returns expected rows |
| 7.2 | Power Apps `nfOpenPipeline` / `nfMyOpportunities` / `nfCapitalHandoffsReady` | Match list filters for current user / open pipeline |
| 7.3 | As Project Manager / Capital Advisor | Can edit Leads & Opportunities (per `PERMISSIONS_MATRIX.md`) |
| 7.4 | As Financial Analyst | Read on Leads/Opportunities; fee fields follow matrix |
| 7.5 | Copilot fields | No secrets in `CopilotSummary` / `CopilotKeywords` |

## 8. Negative / safety

| # | Step | Expected |
|---|------|----------|
| 8.1 | Duplicate qualify / duplicate win | AutomationLogs show SkippedDuplicate or no extra items |
| 8.2 | Lost opportunity | Stage/LostReason activity; no capital create |
| 8.3 | Repair re-run | Idempotent — no destructive schema change |

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Owner / Admin | | | Pass / Fail |
| Capital Advisor (optional) | | | Pass / Fail |

**Notes / defects:**

_

## Related commands (offline — no tenant)

```powershell
python3 tests/unit/test_opportunity_lifecycle.py
python3 tests/crm/smoke_helpers.py
pwsh -File ./scripts/Test-HVCGOpportunityCrmAcceptance.ps1 -Offline
pwsh -File ./tests/Invoke-HVCGPreDeploymentTests.ps1
```
