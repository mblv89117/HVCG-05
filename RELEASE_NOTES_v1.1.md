# RELEASE NOTES — v1.1 (Opportunity CRM Dev)

**Date:** 2026-07-15  
**Scope:** Development acceptance for Opportunity CRM automations in HVCG Command Center Dev  
**Tag context:** builds on v1.1.0 SharePoint baseline + CRM schema repair  

## Highlights

- **Lead → Opportunity** automation green end-to-end in Dev: creates Discovery opportunity, StageChange activity with Opportunity/Lead lookups, stamps `ConvertedOpportunityId`, writes Succeeded AutomationLog.
- **Stage / Won / Capital** CRM flows activated and smoke-validated via idempotent recurrence scanners.
- **Lookup OpenAPI fix:** activity/lead conversion lookups use SharePoint Object form `{ "Id": ... }`; opportunity Id is resolved via SharePoint REST (`HttpRequest`) after create because PostItem `body/ID` is empty at runtime.
- **Teams notifications remain gated Off** in Dev (`hvcg_CrmEnableTeamsNotify=false`); Dev “notification” evidence is AutomationLogs.

## CRM flows (Dev)

| Flow | Behavior |
|------|----------|
| `HVCG_LeadQualifiedCreateOpportunity` | Scans Qualified leads missing conversion; find-or-create opportunity by idempotency key; create activity; patch lead |
| `HVCG_OpportunityStageChangedNotify` | Scans recent opportunities; creates stage activity when key missing |
| `HVCG_OpportunityWonCloseout` | Scans Stage=Won; creates won activity + WinLoss stub + Succeeded log |
| `HVCG_CapitalFundingStatusNotify` | Scans capital opportunities; creates FundingUpdate activity when key missing |

## Smoke results

All suites **PASS / 0 failures** (`crm-smoke-all-final.json`):

- LeadQualified
- StageChanged
- WonCloseout
- CapitalFunding

## Not in this release

- Production promotion
- Teams channel posts enabled by default
- Canvas app `.msapp` package (still tracked as OA-CRM-09)

## Upgrade / apply notes (Dev)

1. Ensure connection reference `hvcg_sharedsharepointonline` remains bound.
2. Keep CRM env vars pointed at `HVCG-CommandCenter-Dev`.
3. Prefer the WO6/WO9 clientdata definitions under `deployment/reports/checkpoints/flow-*-wo*.json` / synced `src/power-automate/definitions/` until next solution export.
