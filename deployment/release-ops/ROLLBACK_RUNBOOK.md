# ROLLBACK RUNBOOK

**Primary source:** `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`

## Before first Prod import

- No Prod solution → rollback = do not import; delete failed import if any  
- Retain unmanaged RC-1 zip + checksums for re-pack  

## After Prod import

1. Prefer solution upgrade rollback / prior managed version re-import  
2. If first import: uninstall managed solution only with owner approval  
3. Restore SharePoint/list data from pre-import backup if data changed  
4. Disable all flows immediately on incident  
5. Re-verify notification gates remain Off  

## Package integrity anchor

Solution SHA-256: `b08b45bc2aad8605d13a6dbce89eb01895510ae64ab452f2ea050a369f9e3522`
