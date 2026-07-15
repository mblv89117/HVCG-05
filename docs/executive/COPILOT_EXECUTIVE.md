# Copilot — Executive briefs and prompts

**Module:** Executive Command Center  
**Baseline:** `docs/architecture/COPILOT_READY.md`  
**AI approval:** Executive briefs need Owner approval if client-external (`docs/ai/AI_APPROVAL_MATRIX.md`).

## Goal

Grounded CEO summaries (pipeline, cash, capital, decisions, risks) without inventing figures.

## Grounding allow-list

| List | Allowed fields |
|------|----------------|
| Clients | Title, ClientCode, ClientStage, OverallHealth, MonthlyRetainer, PaymentStatus, RiskLevel, RequiresExecutiveAttention, CopilotSummary, CopilotKeywords |
| Opportunities | Title, Stage, WinLossStatus, ForecastCategory, WeightedValue, Probability, ExpectedCloseDate, CapitalHandoffStatus, CopilotSummary |
| CapitalOpportunities | Title, ClientCode, CapitalType, FundingStatus, TargetAmount, WeightedValue, FundingProbability, CopilotKeywords |
| Invoices | ClientCode, InvoiceStatus, InvoiceType, Amount, AmountCollected, DueDate |
| FinancialMilestones | ClientCode, MilestoneType, Amount, IsPastDue, RevenueAtRisk, PaymentStatus |
| Decisions | Title, ClientCode, DecisionStatus, EscalationReason, Deadline, Recommendation, FinancialImpact |
| Risks | Title, ClientCode, RiskLevel, RiskStatus, Mitigation |
| Projects | Title, ClientCode, ProjectHealth, ProjectStatus |
| Meetings | Title, ClientCode, MeetingDate, MeetingType |
| Relationships | StrategicValue, SourceDisplayName, TargetDisplayName, NextPlannedInteraction, RevenueInfluenced, CapitalInfluenced |

## Banned

Bank details, TINs, passwords, unpublished diligence, unrestricted guest links, raw email bodies with excess PII. No autonomous external send (`ExternalSendBlocked=true`).

## Prompt library

### P1 — Morning command brief

```
Summarize HVCG executive posture for today using only SharePoint fields I can access.
Cover: Pipeline weighted + Commit forecast; MRR + Outstanding AR; Capital pipeline;
open executive decisions with deadlines; High/Critical risks; meetings in next 14 days.
If a figure is missing, say "not in source". Under 250 words. Bullets only.
```

### P2 — Decision packet

```
For decision "<Title>" / ClientCode <code>, list Background, Options, Recommendation,
FinancialImpact, Deadline, EscalationReason from HVCG_Decisions. Do not add options not in the record.
```

### P3 — Cash & AR

```
List invoices Status in Sent, Partial, Past Due. Show ClientCode, Outstanding (Amount-AmountCollected),
DueDate, InvoiceType. Highlight Past Due retainers first.
```

### P4 — Capital momentum

```
For FundingStatus not Closed/Declined, summarize by status with TargetAmount or WeightedValue
and ExpectedCloseDate. Flag RequiresExecutiveAttention.
```

### P5 — Relationship priorities (Intelligence Q15)

```
Which relationships should the Owner prioritize this week? Use StrategicValue High/Critical
and NextPlannedInteraction within 7 days. Ranked list with one-line why. Owner audience only.
```

### P6 — Internal weekly draft

```
Draft an internal weekly CEO status from Command KPIs. Mark every number with its list source.
Insert [NEEDS OWNER REVIEW] at top. Do not send externally.
```

## Output template

```
# Executive brief — {date}
## North stars
## Decisions due
## Risks
## Meetings (14d)
## Data gaps
```
