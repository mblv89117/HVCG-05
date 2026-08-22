# PnP.PowerShell authentication — HVCG OS

## Why this exists

PnP.PowerShell **3.x** (and builds after **9 Sep 2024**) require:

```powershell
Connect-PnPOnline -Url <site> -Interactive -ClientId <your-entra-app-id>
```

The old shared “PnP Management Shell” multi-tenant app no longer works. Interactive login **without** a Client ID fails with:

> Please specify a valid client id for an Entra ID App Registration.

HVCG wraps this as:

- `Initialize-HVCGPnPAuth` — resolve/cache Client ID
- `Connect-HVCGPnPOnline` — Interactive + ClientId

This Entra app is an **administration / provisioning public client**. It is **not**:

- Atlas runtime
- Hub runtime (`app-atlas-integration-hub`)
- `id-atlas-prod` (`2b9ca61d-2396-4caa-95cd-30200d2ff36a`)
- an unattended production credential

Interactive Manny authentication + MFA is required. **Do not create a client secret or certificate** for this app.

---

## Atlas Capital min-slice (current owner path)

Default registration is **review-only**. It does not mutate Entra.

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1
```

After you accept the printed plan:

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig
```

Then rerun enablement **without** `-Apply`:

```powershell
pwsh -File ./deployment/scripts/Enable-HVCGCapitalMinSlice.ps1
```

Do **not** run Enable `-Apply` until that WhatIf completes successfully.

### What the capital provisioning app is

| Item | Value |
|------|--------|
| Display name | `HVCG-PnP-Capital-Provisioning` |
| Tenant | HVCG Production `3df46563-86f3-4414-87fd-84ba967741ef` / `highvaluecapitalgroup.onmicrosoft.com` |
| Audience | Single-tenant (`AzureADMyOrg`) |
| Redirect | `http://localhost` (public / mobile+desktop client) |
| Secret / cert | **None** — interactive only |
| Config write | gitignored `config/environments/development.json` → `authentication.pnpEntraAppClientId` **only** (plus display name) |

### Permissions (capital default)

| Permission | Resource | Type | Why |
|------------|----------|------|-----|
| AllSites.Manage | SharePoint | Delegated | `Add-PnPField` / `Set-PnPField` / list item create. AllSites.Write cannot change list schema. |
| User.Read | Microsoft Graph | Delegated | Sign-in identity for the public client. |

**Not requested on this app** (and not required for capital enablement):

- SharePoint `AllSites.FullControl`, `User.Read.All`
- Graph `Sites.FullControl.All`, `Group.ReadWrite.All`, `Directory.Read.All`, `User.Read.All`
- Any **application** (app-only) permission

List-level Selected **write** to `id-atlas-prod` and Entra `HVCG-Client-SYN01` are performed with **Azure CLI as Manny**, not with this PnP app.

If `Add-PnPField` later fails with access denied after this consent, PnP/CSOM may require SharePoint delegated `AllSites.FullControl`. That is an escalation to request separately — it is **not** the default.

### Removal

Entra admin center → App registrations → delete `HVCG-PnP-Capital-Provisioning`. Remove `authentication.pnpEntraAppClientId` from local gitignored config. Does **not** change `id-atlas-prod`.

---

## Full OS deploy (opt-in only)

`Deploy-HVCGDevelopment.ps1` historically used broader delegated scopes. That is **not** the capital min-slice path.

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -FullOsDeploy
```

That switch restores `HVCG-PnP-PowerShell` + `AllSites.FullControl` + Graph group/site scopes. Do not use it to unblock Capital Operations.

---

## Config shape

```json
"authentication": {
  "pnpEntraAppClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "pnpEntraAppDisplayName": "HVCG-PnP-Capital-Provisioning"
}
```

Fallbacks if config unset: `HVCG_PNP_CLIENT_ID`, `ENTRAID_CLIENT_ID`, `ENTRAID_APP_ID`.

**`AZURE_CLIENT_ID` is not used.** That variable is the Hub managed identity (`id-atlas-prod`) and must not be treated as the PnP provisioning app.

`development.json` remains gitignored.

Official PnP guide: https://pnp.github.io/powershell/articles/registerapplication.html
