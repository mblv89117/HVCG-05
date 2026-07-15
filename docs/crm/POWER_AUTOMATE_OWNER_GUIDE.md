# Opportunity CRM — Power Automate Owner Import Guide

**Environment:** Development only  
**Package version:** 1.1.0  
**Outbound policy:** Do **not** enable production Teams/email. Keep all four flows **Off** after import. When testing notifications, bind **test channels** and set recipients to **your UPN only**.

Agent packages under `src/power-automate/` are **build sheets + Logic scaffolds**. They are not auto-imported. Owner recreates/imports in Maker.

## Flows to import (4)

| Flow | Build sheet | Definition scaffold | Trigger list | Connections |
|------|-------------|---------------------|--------------|-------------|
| `HVCG_LeadQualifiedCreateOpportunity` | `src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json` | `definitions/HVCG_LeadQualifiedCreateOpportunity.definition.json` | `HVCG_Leads` | SharePoint, Teams, Outlook |
| `HVCG_OpportunityStageChangedNotify` | `flows/HVCG_OpportunityStageChangedNotify.json` | matching definition | `HVCG_Opportunities` | SharePoint, Teams |
| `HVCG_OpportunityWonCloseout` | `flows/HVCG_OpportunityWonCloseout.json` | matching definition | `HVCG_Opportunities` | SharePoint, Teams, Outlook |
| `HVCG_CapitalFundingStatusNotify` | `flows/HVCG_CapitalFundingStatusNotify.json` | matching definition | `HVCG_CapitalOpportunities` | SharePoint, Teams |

See also: [`FLOW_PACKAGE_MATRIX.md`](./FLOW_PACKAGE_MATRIX.md).

## Prerequisites (must exist after CRM schema repair)

Lists:

- `HVCG_Leads`, `HVCG_Opportunities`, `HVCG_OpportunityActivities`
- `HVCG_CapitalOpportunities`, `HVCG_FundingMilestones`, `HVCG_WinLossAnalyses`
- `HVCG_AutomationLogs` (+ `HVCG_AuditEvents` if CreateAuditEvent is implemented)

Bridge / automation fields:

- Opportunities: `CapitalOpportunityId`, `CapitalHandoffStatus`, `HVCG_IdempotencyKey`, `CopilotSummary`, `SalesOwnerEmail`, `NextActionDate`
- CapitalOpportunities: `OpportunityId`, `HandoffSource`, `HVCG_IdempotencyKey`
- Activities: `ActivityType`, `PriorStage`, `NewStage`, `HVCG_IdempotencyKey`

Confirm schema with:

```powershell
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
# then verify schema-validation hasDrift=false
```

## Environment variables / parameters

| Name (solution / flow) | Alias in build sheet | Dev guidance |
|------------------------|----------------------|--------------|
| `hvcg_CommandCenterSiteUrl` | `HVCG_SITE_URL` | Command Center Dev site URL |
| `hvcg_TeamsCrmChannelId` | `HVCG_TEAMS_CRM_CHANNEL_ID` | **Your** CRM test channel id |
| `hvcg_TeamsCrmChannelGroupId` | `HVCG_TEAMS_CRM_CHANNEL_GROUP_ID` | Team id for that channel |
| `hvcg_TeamsCapitalChannelId` | `HVCG_TEAMS_CAPITAL_CHANNEL_ID` | **Your** capital test channel id |
| `hvcg_TeamsCapitalChannelGroupId` | `HVCG_TEAMS_CAPITAL_CHANNEL_GROUP_ID` | Team id for capital channel |
| `hvcg_CrmTestRecipient` | `HVCG_CRM_TEST_RECIPIENT` | **Your UPN only** |
| `hvcg_CrmEnableTeamsNotify` | `HVCG_CRM_ENABLE_TEAMS_NOTIFY` | Default **`false`** |
| `hvcg_OpsEmail` / `hvcg_ExecutiveEmail` | `HVCG_OPS_EMAIL` / `HVCG_EXECUTIVE_EMAIL` | Point both at your UPN during UAT |

Outlook (`shared_office365`) is bound for future failure alerts only. Specs set `outlookSend: false` — do not send mail until explicitly approved.

## Connection references

| Logical name | Connector | Binding |
|--------------|-----------|---------|
| `hvcg_sharedsharepointonline` | SharePoint | Command Center Dev |
| `hvcg_sharedteams` | Microsoft Teams | Test Team/channel only |
| `hvcg_sharedoffice365` | Office 365 Outlook | Your mailbox; no auto-send |

Prefer **HVCG Ops Automation** service account ownership in lasting environments. Personal Maker account is acceptable only for local Dev UAT.

## Owner-only import / activation steps

1. Open [Power Automate Maker](https://make.powerautomate.com) → environment **HVCG Development**.
2. For each of the four flows:
   - Create an **Automated cloud flow** with trigger **When an item is created or modified** (SharePoint) on the list in the matrix, **or** import a solution package if one was exported from these scaffolds.
   - Implement steps from the corresponding `flows/*.json` build sheet; use `definitions/*.definition.json` as the connection/parameter skeleton.
3. Resolve connections:
   - SharePoint → `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`
   - Teams → **test** Team + channel (not company-wide CRM/capital channels)
   - Outlook → your mailbox only
4. Set parameters/env vars per table above. Leave `hvcg_CrmEnableTeamsNotify` = **false**.
5. **Save → Turn Off** every flow.
6. After schema zero-drift, enable **one flow at a time** with a single test item you own:
   1. LeadQualified  
   2. StageChanged  
   3. WonCloseout  
   4. CapitalFundingStatus  
7. Only then set `hvcg_CrmEnableTeamsNotify=true` if you want test-channel posts.
8. Never turn these On in Test/Production without a separate promotion review.

## Activation order checklist

- [ ] Schema repair complete; CRM lists/fields visible
- [ ] All four flows imported
- [ ] Connections resolved (SharePoint / Teams / Outlook as needed)
- [ ] Env vars set; `HVCG_CRM_ENABLE_TEAMS_NOTIFY` = false
- [ ] All flows **Off**
- [ ] LeadQualified On → qualify one lead → one Opportunity + Activity; re-run = SkippedDuplicate
- [ ] StageChanged On → move Stage → Activity (+ optional Teams if flag on)
- [ ] WonCloseout On → Won stamps + WinLoss stub; Capital Raise with ClientId → capital book + milestones
- [ ] CapitalFundingStatus On → Term Sheet+ updates CapitalHandoffStatus bridge
- [ ] Explicit owner approval before any non-test channel or email

## Do not (until explicit approval)

- Post to broad company Teams channels  
- Send client-facing or partner email  
- Enable flows in Test/Production  
- Leave `HVCG_CRM_ENABLE_TEAMS_NOTIFY=true` as the default after import  

## Consistency notes (packages vs schema)

- Opportunity Stages: Discovery → Assessment → Proposal → Negotiation → Won → Lost  
- FundingStatuses include Identified through Closed/Declined/On Hold  
- Default funding milestones use schema `MilestoneType` values (Package Complete, First Outreach, Term Sheet, Appraisal, Commitment, Closing, Funding)  
- Capital create requires `ClientId` (required on `HVCG_CapitalOpportunities`)  
- ServiceInterest → OpportunityType mapping lives in LeadQualified `fieldMap`
