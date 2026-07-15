# Copilot readiness — Opportunity CRM

## Goal

Enable Microsoft 365 Copilot (and future HVCG AI workers) to answer grounded questions about pipeline and capital raises **without** inventing figures or exposing sensitive data.

## Grounding sources (SharePoint)

| List | Fields Copilot may use |
|------|------------------------|
| `HVCG_Opportunities` | Title, Stage, WinLossStatus, OpportunityType, Probability, WeightedValue, ExpectedCloseDate, SalesOwnerEmail, CapitalHandoffStatus, CopilotSummary, CopilotKeywords |
| `HVCG_OpportunityActivities` | Title, ActivityType, ActivityDate, Outcome, CopilotKeywords |
| `HVCG_CapitalOpportunities` | Title, ClientCode, CapitalType, FundingStatus, TargetAmount, CopilotKeywords |
| `HVCG_Leads` | Title, LeadStatus, ServiceInterest, EstimatedValue (no free-text Notes by default) |

## Banned from Copilot context

- Bank account numbers, TINs/EINs, SSA statements  
- Raw email bodies with PII beyond business contact  
- Unpublished proposal PDFs unless separately approved  

## Authoring rules

1. Keep `CopilotSummary` factual and short (stage, next action, dollar intent).  
2. Refresh summary on Stage / FundingStatus changes (flow `HVCG_OpportunityStageChangedNotify` / capital notify).  
3. Prefer keywords: `ClientCode`, capital type, `Commit`/`Pipeline`, owner alias.  

## Example prompts (validated against schema)

- “What open Commit-category opportunities does HVCG have?”  
- “Which capital raises are in Due Diligence?”  
- “Summarize the Summit Ridge opportunity handoff status.”  

## Content types

Capital package library content type `HVCG_CapitalPackageDocument` remains for diligence files; tag packages with ClientCode + FundingStatus for discovery.
