# Copilot — Executive briefs

**Grounding:** Allow-listed fields only. Never invent revenue or legal conclusions.

## Allowed context fields

- Client: Title, ClientCode, OverallHealth, RiskLevel, PaymentStatus, RequiresExecutiveAttention (not InternalNotes unless Owner session)  
- Opportunity: Title, Stage, WeightedValue, ForecastCategory, ExpectedCloseDate  
- Capital: Title, FundingStatus, WeightedValue, ExpectedCloseDate  
- Decision: Title, EscalationReason, Recommendation, FinancialImpact, Deadline  
- Risk: Title, RiskLevel, Mitigation, RiskStatus  

## Prompt pattern (Maker / Copilot Studio later)

```
Summarize the executive attention queue for today.
Use only provided SharePoint rows.
List: ClientCode, item, reason, recommended next action.
Do not propose client-external emails.
Flag any row missing EscalationReason.
```

## Blocked

- Autonomous send to clients or company-wide Teams  
- Mixing cross-client Restricted data into one brief when `IsCrossClient` risks apply (Owner-only review)  

See also: `docs/ai/AI_CONTEXT_POLICY.md`, intelligence Q14–Q15.
