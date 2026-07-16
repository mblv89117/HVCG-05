# ROLLBACK RUNBOOK

**Primary freeze (Track 1 Live - Internal):** `releases/Track-1-Live-Internal/guides/ROLLBACK.md`  
**Also:** `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`

## Immediate

1. Disable `HVCG_LeadQualifiedCreateOpportunity` (Draft/Off)  
2. Keep Teams notify and client emails Off  
3. Do not activate other flows during incident response  

## After Prod import (current)

1. Restore from freeze package SHA-256 `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf`  
2. Re-apply LeadQualified Prod site URL clientdata layer if needed  
3. Repair `HVCGProductionConfig` from Prod export backup if connections unbound  
4. Uninstall managed solution only with owner approval  

## Package integrity anchors

| Artifact | SHA-256 |
|----------|---------|
| Managed freeze / import anchor | `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf` |
| HVCGProductionConfig Prod export | `1d216ae15cde97afe1bf6133a6ff4e39571d866fade0e0b0b2b0baf10ab1e188` |
| RC-1 unmanaged (historical) | `b08b45bc2aad8605d13a6dbce89eb01895510ae64ab452f2ea050a369f9e3522` |
