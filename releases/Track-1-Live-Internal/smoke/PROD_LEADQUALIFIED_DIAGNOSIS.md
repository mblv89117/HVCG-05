# PROD LeadQualified diagnosis

**When:** 2026-07-16T03:00Z (approx)  
**Approval:** `APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE`

## Root cause (confirmed)

Live flow `HVCG_LeadQualifiedCreateOpportunity` (`1716e663-153f-5588-af1a-56f3fb9ec2d4`) uses a **plain String parameter** `hvcg_CommandCenterSiteUrl` with:

`defaultValue = https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`

There is **no** environment-variable metadata in `clientdata` (`environmentvariable` / `schemaName` count = 0).  
Therefore Dataverse env var **Values** pointing at Prod Command Center do **not** override the flow parameter. The Activated Prod flow polls **Dev**.

## Supporting evidence

| Check | Result |
|-------|--------|
| Prod `HVCG_AutomationLogs` ItemCount | **0** (never wrote to Prod) |
| Prod lead Id=1 | Qualified, ConvertedOpportunityId blank |
| Prod Opportunities / Activities | Empty |
| Dev AutomationLogs LeadQualified | Bulk Started/Succeeded ~2026-07-15 23:16–23:18 PT after Prod activation (catch-up on already-converted Dev leads) |
| Prod list schema (4 CRM lists) | Present; fields needed for LeadQualified path exist |
| Flow trigger | Recurrence 1 minute (not SharePoint webhook) |

## Fix in scope

Patch live `clientdata` parameter defaultValue Dev → Prod site URL only.  
Do not activate other flows. Do not change Teams/email gates. Do not reimport managed solution.

## Rollback

Revert parameter defaultValue to Dev URL **or** turn flow Draft/Off.
