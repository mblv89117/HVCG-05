# Screen: Opportunity Detail (scrOpportunityDetail)

## Purpose

Single-opportunity workspace for High Value Capital Group sellers and capital advisors.

## Data sources

- `HVCG_Opportunities` (selected item)
- `HVCG_OpportunityActivities` filtered by OpportunityId
- `HVCG_Proposals` filtered by OpportunityId
- `HVCG_DiscoveryCalls` filtered by OpportunityId / LeadId
- `HVCG_CapitalOpportunities` lookup when `CapitalOpportunityId` set
- `HVCG_Clients` / `HVCG_Leads` for context cards

## Sections

1. **Header** — Title, Stage, WinLossStatus, SalesOwnerEmail, NextActionDate  
2. **Commercial** — ProposalAmount, Probability, WeightedValue, ForecastCategory, fee impacts  
3. **Lifecycle** — LeadId, ClientId, OpportunityType, CapitalHandoffStatus, CapitalOpportunityId  
4. **Copilot panel** — CopilotSummary + CopilotKeywords (editable; used for grounding)  
5. **Teams** — TeamsThreadUrl  
6. **Timeline** — Gallery of activities (Call / Email / Meeting / Note / StageChange / Handoff / FundingUpdate)  
7. **Proposals** — related gallery with status  
8. **Capital book** — if linked, show FundingStatus, TargetAmount, milestones deep-link to scrCapital  

## Buttons

- **Add activity** → form into `HVCG_OpportunityActivities`
- **New proposal** → navigate / form `HVCG_Proposals`
- **Open capital book** → `Navigate(scrCapital)` when CapitalOpportunityId present
- **Mark handoff Ready** → confirm dialog → patch CapitalHandoffStatus

## Copilot readiness

- Keep `CopilotSummary` ≤ ~500 characters, factual.
- Keywords should include ClientCode, CapitalType intent, Stage.
- Do not put secrets (TIN, bank) in Copilot fields.
