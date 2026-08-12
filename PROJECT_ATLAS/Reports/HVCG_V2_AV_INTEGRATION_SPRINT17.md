# AV Integration Evidence — Sprint 17

| Item | Result |
|------|--------|
| Service | No approved Production scanner available |
| Integration | `StagingAvAdapter` MOCK + fail-safe quarantine |
| Clean | Case L → SCAN_CLEAN |
| Reject | Case M → EICAR **test fixture** string → SCAN_REJECTED (not real malware) |
| Unavailable/timeout/error | Case N → QUARANTINED fail-safe |
| Production AV complete | **false** |
| Owner action | Procure/configure approved AV; EXTERNAL_DEPENDENCY |
