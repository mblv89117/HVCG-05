# PROD SMOKE REPORT — Read-only

**When:** 2026-07-16T02:33:24Z  
**Approval:** APPROVE PROD SMOKE TESTS  
**Overall:** **PASS** (8 PASS · 0 FAIL · 1 INFO)

## Scope

Read-only validation of HVCG Production after managed import.  
**Did not** activate flows, invoke CRM smoke harness, send email/Teams, publish canvas, or import clients.

## Results

| ID | Check | Result |
|----|-------|--------|
| S1 | Correct Production environment | **PASS** |
| S2 | Managed solution present | **PASS** |
| S3 | Connection references bound 4/4 | **PASS** |
| S4 | PAC connections Connected | **PASS** |
| S5 | Prod SharePoint Values (no -Dev in Value) | **PASS** |
| S6 | Notification gates Off | **PASS** |
| S7 | All HVCG cloud flows Draft/Off | **PASS** |
| S8 | No flow execution / no sends this run | **PASS** |
| S9 | Definition DefaultValue still contains Dev site URLs | **INFO** |

## Flow state

All **15** HVCG modern flows are **Draft** (Off).

## Residual INFO

Definition defaultvalue fields still contain Dev SharePoint URLs. Current Values are Prod. Before activating flows, confirm each flow SharePoint site parameter resolves from environment variable Value, not baked Dev defaults.

## Next owner gate

Functional CRM smoke requires activating specific flows — separate approval, for example:

`APPROVE ACTIVATE HVCG_LeadQualifiedCreateOpportunity IN HVCG PRODUCTION`
