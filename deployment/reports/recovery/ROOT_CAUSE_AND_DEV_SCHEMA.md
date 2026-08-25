# Atlas Schema Recovery — Root Cause & Dev Validation

- Generated: 2026-07-21T05:30:34.538286+00:00
- Branch: `fix/atlas-schema-recovery`
- Backup: `deployment/reports/recovery-backup-20260721-052723/`

## Root cause (July 14, 2026 Dev deploy)

1. Field provisioning accessed `.choices` under StrictMode on non-choice fields → terminating exceptions before many fields were created.
2. Lookup provisioning used unsupported `Add-PnPField -Values` / lookup parameters on PnP.PowerShell 3.x.
3. Deployment continued after field failures; views/seed then failed on missing fields (e.g. Email, ClientCode).
4. Repeated interactive PnP auth increased flakiness.

## Code status (verified)

- `Get-HVCGPropertyValue` / `Get-HVCGColumnSchemaFacade` StrictMode-safe optional property access — **present**.
- Choice settings applied only for Choice/MultiChoice — **present**.
- Lookups via `Add-PnPFieldFromXml` with list GUID — **present**.
- Fail-fast after field errors; views gated on schema compliance — **present**.
- Unit suite `Invoke-HVCGPreDeploymentTests.ps1` — **PASS**.

## Live Dev SharePoint schema (Graph validation)

- Site: https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter-Dev
- Indexed lists: 82
- Live lists: 92
- Missing lists: 0
- Fully compliant lists: 82
- Missing fields: 0
- **Compliant: True**

## Remaining production blockers

1. Graph delegated token is **Sites.Read.All** — cannot write SharePoint list items (403). Real client import into `HVCG_Clients` requires PnP interactive/device login or Sites.ReadWrite.All app permission + admin consent.
2. `HVCG_Clients` currently contains **sample seed** rows only (SRM01/HVD01/CLX01), not ACCG / Prodigy / Colorado Craft Beef / etc.
3. Elite Clients page still binds `workspaceCatalog` demo catalog — must bind Client 360 live API.
4. Certificate-based unattended PnP auth not yet configured in Keychain/Key Vault.

