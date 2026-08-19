# 08 — Validation Rules

## Entity integrity

| Rule ID | Rule | Severity |
|---------|------|----------|
| VAL-001 | ClientCode unique among active Clients | Error |
| VAL-002 | OrganizationCode / WorkspaceCode unique | Error |
| VAL-003 | Client-scoped row must have ClientCode **and** resolvable ClientId when lookup present | Error |
| VAL-004 | Workspace.OrganizationId must match Client.OrganizationId when Client.DefaultWorkspace set | Error |
| VAL-005 | Opportunity.ClientCode must equal related Client.ClientCode after backfill | Error |
| VAL-006 | KpiRecord.DataProvenance required; `verified` requires Finance role + non-null SourceSystem | Error |
| VAL-007 | EnterpriseValueAssessment currency amounts forbidden when DataProvenance=`sample` in Prod (Prod blocks sample entirely) | Error |
| VAL-008 | FinancingCondition requires CapitalOpportunityId | Error |
| VAL-009 | ValueDriver.WeightPct between 0 and 100 when set | Warning |
| VAL-010 | Note.RegardingType/RegardingKey required | Error |
| VAL-011 | FinancialPeriod.IsClosed=true blocks new Budget/ForecastLine inserts | Error |
| VAL-012 | AIInsight.HumanApprovalStatus must be Approved before Executive Dashboard publish | Error |
| VAL-013 | AuditEvent is append-only (no update/delete via app) | Error |
| VAL-014 | Document lists must not store file binaries — URL/DriveItemId only | Error |
| VAL-015 | FundingStatus / choice values must match schema spelling (e.g. `Term Sheet`) | Error |

## Referential checks (batch)

- Orphan Tasks (ProjectId missing and not Internal)  
- CapitalOpportunity.ClientCode ≠ parent Client  
- ForecastLine without ForecastId after Phase C  
- Cross-workspace ClientCode leakage in client workspace queries  

## Automated hooks

| Test | Location |
|------|----------|
| List schema presence | `tests/unit/Test-HVCGSchemaValidation.ps1` |
| Python schema unit | `tests/unit/test_schemas.py` |
| Foundation contract | Add `tests/unit/test_atlas_foundation_contract.py` (QA to wire) |

## Data quality SLAs (Dev)

| Check | Target |
|-------|--------|
| Clients with OrganizationId after Phase B | 100% |
| Opportunities with ClientCode | 100% |
| Sample rows in Prod | 0 |
