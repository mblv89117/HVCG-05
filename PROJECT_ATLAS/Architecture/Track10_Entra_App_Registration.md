# Track 10 — Entra app registration requirements (HVCG)

Create a **single-page application** registration in tenant `3df46563-86f3-4414-87fd-84ba967741ef`.

## App registration

| Field | Value |
|-------|--------|
| Name | `HVCG-Atlas-Elite-OS-DEV` |
| Supported account types | Accounts in this organizational directory only |
| Platform | **Single-page application (SPA)** |
| Redirect URIs (local) | `http://127.0.0.1:5180`, `http://localhost:5180` |
| Redirect URIs (hosted) | `https://<swa-hostname>/` (exact SWA default hostname + custom domain if any) |
| Front-channel logout | same origins |
| Implicit grant | **Off** (use auth code + PKCE via MSAL) |
| Client secret | **None** (public SPA) |

## API permissions (Delegated)

| API | Permission | Admin consent |
|-----|------------|---------------|
| Dynamics CRM | `user_impersonation` | Yes (Dev) |
| Microsoft Graph | `User.Read` | Yes |
| Microsoft Graph | `Sites.Read.All` | Yes (or site-scoped later) |
| Microsoft Graph | `Files.Read.All` | Yes (or narrower) |
| Microsoft Graph | `Calendars.Read` | Yes |
| Microsoft Graph | `Mail.Read` | Optional / avoid if unused |

Do **not** grant Mail.Send or any client-communication send permission in Development.

## Expose / CORS

In Power Platform Admin Center → HVCG Development → Dataverse:

- Allow the SWA origin under **CORS** (and `http://127.0.0.1:5180` for local)

## Environment variables after registration

```bash
VITE_ENTRA_CLIENT_ID=<application-(client)-id>
VITE_ENTRA_TENANT_ID=3df46563-86f3-4414-87fd-84ba967741ef
VITE_REDIRECT_URI=https://<swa-hostname>
VITE_DATAVERSE_URL=https://org1131a2b0.crm.dynamics.com
```

## Security roles (Dataverse)

Manny / testers need a Dev security role that can read (and limited write) `hvcg_atlas*` tables — System Customizer or a dedicated **Atlas Executive Dev** role with least privilege.
