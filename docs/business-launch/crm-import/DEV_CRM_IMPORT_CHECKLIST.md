# DEV_CRM_IMPORT_CHECKLIST

**Division:** Product Development  
**Env:** HVCG Development only · **Prod:** Forbidden  

## Green-band first (import when COO clears — not waiting on CEO)

| Order | Code | Shell | Pricing lock | Ready? |
|-------|------|-------|--------------|--------|
| 1 | ACCG01 | `crm-import/ACCG01_dev_shell.json` | $4,539 LOCKED | Yes — soft clear by COO |
| 2 | PROD01 | `PROD01_dev_shell.json` | ~$7,500; AR risk | Yes after collections note |
| 3 | CHRI01 | `CHRI01_dev_shell.json` | $4,750 pattern | Yes |
| 4 | FROC01 | shell | Tiered | Yes |

## Pre-import
- [ ] Classification HVS_LEGACY on all  
- [ ] PortalEnabled=false  
- [ ] DoNotContact=true on contacts until BL-C1  
- [ ] Idempotency keys set  
- [ ] No HVCG rate card fields on legacy rows  

## Next task generated
Dry-run validation script against shell JSON schema (no API write).
