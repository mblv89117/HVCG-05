# Screen Spec — scrFinanceCollections

**Module:** Finance Operations  
**Audience:** Finance viewers / Ops Manager

## Purpose

Follow-up queue: next-action collections, broken payment plans, executive attention flags.

## Data

| Collection | Source |
|------------|--------|
| `colFinNextActions` | `HVCG_CollectionsActivities` where NextActionDate <= Today+7 |
| `colFinActivePlans` | `HVCG_FinancePaymentPlans` where PlanStatus = Active |
| `colFinBrokenPlans` | PlanStatus = Broken |
| `colFinExecFlags` | Activities or Plans with RequiresExecutiveAttention |

## Layout

1. Next-action gallery (client, invoice, activity type, outcome)  
2. Active payment plans  
3. Attention / broken plans  
4. Quick add activity form

## Rules
- No automatic client email from this screen in V1.  
- Escalation sets flag only; Executive module reads it.
