# Opportunity CRM — Flow packaging & connection matrix

Prepared for Maker import. **No emails/Teams sends are performed by this packaging.** All CRM flows ship with `defaultState: Off` and `outboundPolicy.teamsEnabledByDefault: false`.

**Package version:** 1.1.0  
**Owner guide:** [`POWER_AUTOMATE_OWNER_GUIDE.md`](./POWER_AUTOMATE_OWNER_GUIDE.md)

## Package inventory

| # | Flow display name | Flow JSON | Definition JSON | Trigger | Default state |
|---|-------------------|-----------|-----------------|---------|---------------|
| 1 | HVCG_LeadQualifiedCreateOpportunity | `src/power-automate/flows/HVCG_LeadQualifiedCreateOpportunity.json` | `src/power-automate/definitions/HVCG_LeadQualifiedCreateOpportunity.definition.json` | Leads modified → `LeadStatus` = Qualified | Off |
| 2 | HVCG_OpportunityStageChangedNotify | `src/power-automate/flows/HVCG_OpportunityStageChangedNotify.json` | `.../HVCG_OpportunityStageChangedNotify.definition.json` | Opportunities `Stage` changed | Off |
| 3 | HVCG_OpportunityWonCloseout | `src/power-automate/flows/HVCG_OpportunityWonCloseout.json` | `.../HVCG_OpportunityWonCloseout.definition.json` | `Stage` or `WinLossStatus` = Won | Off |
| 4 | HVCG_CapitalFundingStatusNotify | `src/power-automate/flows/HVCG_CapitalFundingStatusNotify.json` | `.../HVCG_CapitalFundingStatusNotify.definition.json` | CapitalOpportunities `FundingStatus` changed | Off |

Indexes (CRM entries; other platform flows preserved):

- `src/power-automate/flows/_index.json`
- `src/power-automate/definitions/_index.json`

## Field / list matrix

| Flow | Reads | Writes | Optional outbound |
|------|-------|--------|-------------------|
| LeadQualified | `HVCG_Leads` | `HVCG_Opportunities`, Lead `ConvertedOpportunityId`, `HVCG_OpportunityActivities`, AutomationLogs/Audit | Teams CRM **test** channel if flag |
| StageChanged | `HVCG_Opportunities` | Activities, Opportunity `CopilotSummary`, logs | Teams when Stage in Proposal/Negotiation/Won/Lost **and** flag |
| WonCloseout | `HVCG_Opportunities` | Opportunities (Won stamps), `HVCG_WinLossAnalyses`, Capital book + FundingMilestones, Activities, logs | CRM + Capital **test** channels if flag |
| FundingStatus | `HVCG_CapitalOpportunities` | Activities, linked Opportunity `CapitalHandoffStatus`, logs | Capital **test** channel for Term Sheet / Due Diligence / Committed / Closed / Declined if flag |

### Key field consistency

| Concept | Valid values / mapping |
|---------|------------------------|
| LeadStatus (trigger) | Qualified |
| Opportunity Stage | Discovery, Assessment, Proposal, Negotiation, Won, Lost |
| WinLossStatus | Open, Won, Lost, Abandoned |
| CapitalHandoffStatus | NotApplicable → Ready → HandedOff → InFunding → Funded / Declined |
| FundingStatus → bridge | Term Sheet / Due Diligence / Committed → InFunding; Closed → Funded; Declined → Declined |
| ServiceInterest → OpportunityType | See LeadQualified `fieldMap` (Capital Advisory → Capital Raise, etc.) |
| FundingMilestones.MilestoneType | Package Complete, First Outreach, Term Sheet, Appraisal, Commitment, Closing, Funding |
| Idempotency | `HVCG_IdempotencyKey` patterns documented per flow |

## Connection references

| API name | Logical name | Env binding | Test restriction |
|----------|--------------|-------------|------------------|
| `shared_sharepointonline` | `hvcg_sharedsharepointonline` | Command Center Dev | Required |
| `shared_teams` | `hvcg_sharedteams` | Test Team/channel only | Required if notify enabled |
| `shared_office365` | `hvcg_sharedoffice365` | Your mailbox | Optional; `outlookSend: false` |

## Environment / feature flags

| Variable | Default | Role |
|----------|---------|------|
| `HVCG_CRM_ENABLE_TEAMS_NOTIFY` / `hvcg_CrmEnableTeamsNotify` | `false` | Master gate for all Teams posts |
| `HVCG_CRM_TEST_RECIPIENT` / `hvcg_CrmTestRecipient` | owner UPN | Failure/notify identity for UAT |
| `HVCG_TEAMS_CRM_CHANNEL_ID` (+ Group Id) | empty | Pipeline test channel |
| `HVCG_TEAMS_CAPITAL_CHANNEL_ID` (+ Group Id) | empty | Capital test channel |

## Activation policy (Development UAT)

1. Import all four; leave **Off**.  
2. After schema zero-drift, enable LeadQualified only; qualify a lead you own.  
3. Confirm Opportunity + Activity; confirm no Teams post while flag is false.  
4. Enable StageChanged → WonCloseout → CapitalFundingStatus in order.  
5. Optionally set flag true against **test** channels only.  
6. Any client-facing send or company channel requires explicit owner approval.

## Validation checklist (pre-merge / pre-activation)

- [ ] Flow JSON ↔ definition JSON name, trigger list, connection refs match  
- [ ] `defaultState: Off` on all four packages  
- [ ] `outboundPolicy.featureFlag` = `HVCG_CRM_ENABLE_TEAMS_NOTIFY`  
- [ ] Milestone types match `HVCG_FundingMilestones` schema (not legacy Package/Outreach labels)  
- [ ] Capital handoff documents required `ClientId`  
- [ ] Indexes list all four CRM flows without dropping platform flows  
- [ ] Owner guide lists import steps and forbidden outbound actions  
