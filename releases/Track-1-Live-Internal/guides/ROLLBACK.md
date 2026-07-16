# ROLLBACK — Track 1 Live - Internal

**Tag:** Track 1 Live - Internal  
**Frozen managed SHA-256:** `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf`

## Immediate

1. Turn **Off** `HVCG_LeadQualifiedCreateOpportunity` (Draft).  
2. Leave all other HVCG flows Draft.  
3. Keep `hvcg_CrmEnableTeamsNotify=false` and `hvcg_EnableClientEmails=false`.

## Package restore

| Artifact | Path |
|----------|------|
| Managed import anchor | `../solution/HVCGCommandCenterDev_managed_1.1.0.1_IMPORT_ANCHOR.zip` |
| LeadQualified Prod clientdata layer | `../solution/HVCG_LeadQualifiedCreateOpportunity.clientdata.PROD_LAYER.json` |
| Config solution backup | `../backup/HVCGProductionConfig_unmanaged_1.0.0.0_PROD_EXPORT.zip` |

Uninstall managed solution only with **explicit owner approval**.

## Related

- `deployment/release-ops/ROLLBACK_RUNBOOK.md`  
- `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`
