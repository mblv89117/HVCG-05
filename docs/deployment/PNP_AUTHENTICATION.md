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

## One-time registration (Development)

```powershell
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -UpdateConfig
```

What it does:

1. Resolves your tenant’s initial `*.onmicrosoft.com` domain (via Graph when possible)  
2. Runs `Register-PnPEntraIDAppForInteractiveLogin` with SharePoint + Graph delegated permissions suited to Dev deploy  
3. Writes `authentication.pnpEntraAppClientId` into `config/environments/development.json` when `-UpdateConfig` is set  

Optional:

```powershell
# Explicit tenant domain
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Tenant contoso.onmicrosoft.com -UpdateConfig

# Device code flow (no popup)
pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -DeviceLogin -UpdateConfig
```

## Config shape

```json
"authentication": {
  "pnpEntraAppClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "pnpEntraAppDisplayName": "HVCG-PnP-PowerShell"
}
```

Fallbacks (if config unset): environment variables `ENTRAID_CLIENT_ID`, `ENTRAID_APP_ID`, `AZURE_CLIENT_ID`, or `HVCG_PNP_CLIENT_ID`.

`development.json` remains gitignored.

## After registration

```powershell
pwsh -File ./deployment/Deploy-HVCGDevelopment.ps1
# or
pwsh -File ./deployment/install/Install-HVCGOS.ps1 -Environment development
```

You will still sign in interactively (MFA/Conditional Access apply). No app-only certificate is required for Development.

## Default permissions registered by `Register-HVCGPnPEntraApp.ps1`

| Parameter | Values |
|-----------|--------|
| `-SharePointDelegatePermissions` | `AllSites.FullControl`, `User.Read.All` |
| `-GraphDelegatePermissions` | `User.Read`, `Group.ReadWrite.All`, `Directory.Read.All`, `Sites.FullControl.All` |

Do **not** pass `Sites.FullControl.All` to `-SharePointDelegatePermissions` — that name is a Graph/application scope and PnP will reject it.

## Manual Entra registration (if the script cannot run)

1. [Entra admin center](https://entra.microsoft.com) → **App registrations** → **New registration**  
2. Name: `HVCG-PnP-PowerShell`  
3. **Authentication** → platform **Mobile and desktop applications** → redirect `http://localhost`  
4. **API permissions** → SharePoint delegated **`AllSites.FullControl`** (do not use Graph name `Sites.FullControl.All` on the SharePoint API). Graph delegated as needed (`Group.ReadWrite.All`, `Directory.Read.All`, `Sites.FullControl.All`) → **Grant admin consent**  
5. Copy **Application (client) ID** into `authentication.pnpEntraAppClientId`

Official PnP guide: https://pnp.github.io/powershell/articles/registerapplication.html
