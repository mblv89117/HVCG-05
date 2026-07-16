# PROD LeadQualified functional smoke — PASS

**When:** 2026-07-16T03:02:51Z  
**Approval:** `APPROVE DIAGNOSE AND RERUN PROD LEADQUALIFIED FUNCTIONAL SMOKE`  
**Overall:** **PASS** (0 failures)

## Diagnosis

Activated Prod flow parameter `hvcg_CommandCenterSiteUrl` was a plain String still defaulting to **Dev** Command Center. Dataverse env var Values (Prod) did not override it. Flow wrote to Dev; Prod AutomationLogs stayed empty.

## Fix applied

| Step | Result |
|------|--------|
| Patch live `clientdata` defaultValue Dev → Prod | OK (`prod-site-url-patch.log`) |
| Re-Activate LeadQualified only | OK — still only flow Activated |
| Teams / client email gates | Unchanged `false` |

## Smoke result

| Field | Value |
|-------|-------|
| Site | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` |
| Lead | Id=2 (`CRM-PROD-LQ-20260715-200131`) |
| Opportunity | Id=2 |
| Activity | Id=2 |
| Succeeded log | Id=4 — `Created opportunity 2 for lead 2` |
| Evidence JSON | `prod-smoke-leadqualified-20260715-200131.json` |

Also after fix: prior smoke lead Id=1 converted (Opp Id=1; logs 1–2).

## Residual

- Flow site URL is still a **plain parameter** (now Prod), not true env-var metadata — future package should bind `hvcg_CommandCenterSiteUrl` as an environment variable reference.
- Definition DefaultValues for env vars still contain `*-Dev` URLs (Values override for Dataverse; flow param was the live bug).
- 14 other HVCG flows remain Draft. No Teams/email sends.

## Next owner gate (optional)

Declare Track 1 LIVE—INTERNAL / activate next CRM flow — separate explicit approval required.
