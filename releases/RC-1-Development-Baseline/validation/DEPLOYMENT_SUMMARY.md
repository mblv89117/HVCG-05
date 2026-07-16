# DEPLOYMENT_SUMMARY — Opportunity CRM Dev (v1.1 acceptance)

**Generated:** 2026-07-15T23:56:38Z  
**Target:** Development only  
**Power Platform env:** HVCG Development (`c03b1329-4394-ece7-acc9-c50794b3db1e` / `https://org1131a2b0.crm.dynamics.com/`)  
**SharePoint hub:** `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev`  
**Auth profile reused:** `HVCG-Dev-Maker` (manny@highvaluecapitalgroup.com)  
**Production:** not deployed

## What was deployed / repaired

1. Unmanaged solution **HVCGCommandCenterDev** (pre-existing import 1.1.0.x) retained.
2. Four CRM cloud flows patched in Dataverse (`workflow.clientdata`) and left **On**:
   - LeadQualified (WO6 recurrence + HTTP Id capture)
   - Stage / Won / Capital (WO9 HTTP list + find + PostItem activity)
3. Connection references remain bound to Dev OAuth connections (SharePoint / Outlook / Teams / Approvals).
4. Env var `hvcg_CrmEnableTeamsNotify` remains **false**.

## Acceptance evidence

| Artifact | Purpose |
|----------|---------|
| `FINAL_ACCEPTANCE_REPORT.md` | Gate verdict |
| `RELEASE_NOTES_v1.1.md` | Release narrative |
| `deployment/reports/checkpoints/crm-smoke-leadqualified-final.json` | LeadQualified E2E |
| `deployment/reports/checkpoints/crm-smoke-all-final.json` | Combined CRM smoke (0 fails) |
| `deployment/reports/checkpoints/flow-LeadQualified-wo6-recurrence.json` | Applied LeadQualified pack |
| `deployment/reports/checkpoints/flow-*-wo9-http.json` | Applied Stage/Won/Capital packs |

## Smoke outcomes

```
CRM_SMOKE_FAILS=0 PASSED=True
suites: LeadQualified=true Stage=true Won=true Capital=true
```

LeadQualified detailed checks (opp create, activity + lookups, notifications via logs, SharePoint field persist, flow active): all PASS.

## Operator follow-ups (optional)

- Export refreshed unmanaged solution from Dev for source-of-truth packaging.
- Canvas app build (OA-CRM-09) when scheduled.
- Promote to Test only after separate Test acceptance; never flip Teams notify without explicit approval.

## Do not

- Point these scanners at Production lists.
- Re-enable Teams notify without an explicit Dev test plan.
- Treat GetOnUpdatedItems polling as primary trigger without revalidation (failed after repeated clientdata patches; recurrence+HTTP used instead).
