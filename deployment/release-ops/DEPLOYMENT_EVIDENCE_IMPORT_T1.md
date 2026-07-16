# DEPLOYMENT EVIDENCE — Track 1 Import

**Status:** DEPLOYED — connection binding pending; flows not activated  
**When:** 2026-07-16T02:11:37Z  
**Operator:** deployment-engineer via PAC (owner-approved)

## Approval

Phrase: `APPROVE IMPORT HVCGCommandCenterDev 1.1.0.1 INTO HVCG PRODUCTION`

## Target

| Field | Value |
|-------|-------|
| Environment | HVCG Production |
| Environment ID | f141a2cf-ae13-eb59-84c4-25817d899105 |
| Org URL | https://orgee2f7545.crm.dynamics.com/ |

## Package

| Field | Value |
|-------|-------|
| File | HVCGCommandCenterDev_managed_1.1.0.1.zip |
| SHA-256 | 515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf |
| Import ID | e58b1d8b-bb80-f111-ab0e-6045bd019b72 |
| Result | Solution Imported successfully |
| Managed | True |
| Version in Prod | 1.1.0.1 |

## PAC note

> A connector was imported, however the related connection references need connections created and then any dependent flows can be started.

**Flows:** Not started / not activated by this import (`--activate-plugins` was not used).

## Post-import required (owner)

1. Create Prod connections (SharePoint, Outlook, Teams, Approvals)
2. Bind to connection references in solution
3. Verify env vars = Prod SP URLs; notify/email gates false
4. Separate approval before turning any flow On
