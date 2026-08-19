# Smoke Tests — Project Atlas

## Purpose

Functional smoke after Dev deploy — CRM and OS paths.

## Existing tools (reuse)

| Suite | Path |
|-------|------|
| LeadQualified | `deployment/scripts/crm/Invoke-CrmLeadQualifiedSmoke.ps1` |
| All CRM | `deployment/scripts/crm/Invoke-CrmAllSmoke.ps1` |
| Predeploy tests | `tests/Invoke-HVCGPreDeploymentTests.ps1` |

**Do not** use `deployment/release-ops/Invoke-ProdLeadQualifiedSmoke.ps1` from Atlas.

## Atlas wrapper

```powershell
pwsh -File ./deployment/atlas/scripts/Invoke-AtlasSmoke.ps1 -Environment development -Suite LeadQualified
```

## Pass criteria

- Suite exit code 0
- Evidence JSON written under `deployment/atlas/reports/` or existing checkpoint path (copied summary)

## Gates

Smoke must keep Teams notify Off and must not send client email.
