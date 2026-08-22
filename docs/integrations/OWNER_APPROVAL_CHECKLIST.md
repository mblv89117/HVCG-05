# Owner Approval Checklist — Universal Integration Layer

Manny is interrupted **only** for the items below. Complete them in one sitting when possible.

After each step, tell the Atlas agent “done” so implementation can resume immediately.

---

## A. Microsoft Entra ID app (Priority 1)

### A1. Register (or extend) confidential client for Integration Hub

1. Open [Microsoft Entra admin center](https://entra.microsoft.com) → **Identity** → **Applications** → **App registrations** → **New registration**.  
2. Name: `Atlas Integration Hub (Dev)` (create separate apps for Staging / Production later).  
3. Supported account types: **Accounts in this organizational directory only** (HVCG tenant).  
4. Redirect URI → **Web** → `http://localhost:8790/api/oauth/microsoft/callback`  
   - Entra requires `https://…` or `http://localhost…` — **not** `http://127.0.0.1`.  
5. Register.

### A2. Certificates & secrets

1. **Certificates & secrets** → **New client secret** → description `atlas-integration-dev` → copy **Value** once.  
2. Store as `MICROSOFT_CLIENT_SECRET` in `.secrets/integration.env` (never in chat/git).

### A3. API permissions (delegated — read-only discovery)

Add **Microsoft Graph** delegated permissions:

| Permission | Purpose |
|------------|---------|
| `openid` `profile` `offline_access` | Sign-in + refresh |
| `User.Read` | Profile verify |
| `Mail.Read` | Outlook / Exchange search & read |
| `Calendars.Read` | Calendar |
| `Contacts.Read` | Contacts |
| `Files.Read.All` | OneDrive / files |
| `Sites.Read.All` | SharePoint sites & libraries |

Click **Grant admin consent for [tenant]** (required once).

Do **not** add `Mail.Send`, `Mail.ReadWrite`, `Files.ReadWrite`, or application permissions unless a later elevated-mode approval is requested.

### A4. Copy IDs into secrets

```
MICROSOFT_TENANT_ID=<Directory (tenant) ID>
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<secret value>
MICROSOFT_REDIRECT_URI=http://localhost:8790/api/oauth/microsoft/callback
```

Also set SPA `VITE_ENTRA_CLIENT_ID` for Elite OS login if not already set (public client — no secret in SPA).

---

## B. Google Cloud OAuth (Priority 2)

1. Open [Google Cloud Console](https://console.cloud.google.com) → create/select project `atlas-integration-dev`.  
2. **APIs & Services** → enable: Gmail API, Google Drive API, Google Calendar API, People API.  
3. **OAuth consent screen** → External or Internal (Workspace) → App name `Project Atlas` → add scopes:  
   - `https://www.googleapis.com/auth/gmail.readonly`  
   - `https://www.googleapis.com/auth/drive.readonly`  
   - `https://www.googleapis.com/auth/calendar.readonly`  
   - `https://www.googleapis.com/auth/contacts.readonly`  
4. **Credentials** → **Create OAuth client ID** → **Web application**  
   - Authorized redirect: `http://127.0.0.1:8790/api/oauth/google/callback`  
5. Copy Client ID + Secret to:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://127.0.0.1:8790/api/oauth/google/callback
```

---

## C. GitHub App (Priority 3)

1. GitHub → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**.  
2. Name: `Project Atlas`  
3. Homepage: Atlas docs URL (or HVCG site).  
4. Callback URL: `http://127.0.0.1:8790/api/oauth/github/callback`  
5. Webhook URL: `https://<public-https-host>/api/webhooks/github` (use a tunnel for local; leave inactive until HTTPS ready).  
6. Webhook secret: generate and store as `GITHUB_WEBHOOK_SECRET`.  
7. Permissions (start read-only):  
   - Repository: Contents (Read), Issues (Read), Pull requests (Read), Metadata (Read), Actions (Read), Discussions (Read), Projects (Read)  
   - Later (Workflow Execution approval): Issues (Read & write), Contents (Read & write for approved branches only)  
8. **Where can this app be installed?** → Only on this account / HVCG org.  
9. Generate private key → store PEM as `GITHUB_APP_PRIVATE_KEY` (file path or escaped multiline in secret store).  
10. Install the App on **selected repositories only** (not all).  
11. Copy:

```
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_REDIRECT_URI=http://127.0.0.1:8790/api/oauth/github/callback
```

---

## D. Token encryption key

Generate once (do not paste into chat):

```bash
openssl rand -base64 32
```

Set `INTEGRATION_TOKEN_ENCRYPTION_KEY=<value>` in `.secrets/integration.env`.  
Production: store the same secret in Azure Key Vault (`kv-atlas-…`).

---

## E. What Atlas will do after you approve

1. Load secrets from `.secrets/integration.env` / Key Vault  
2. Start Integration Hub  
3. You open **Connections Center** → Connect Microsoft / Google / GitHub  
4. Complete consent once per provider  
5. Run validation sync  
6. Proceed to autonomous client discovery (read-only)

---

## Bundle confirmation

Reply with which sections are complete, e.g.:

`Owner approvals complete: A, D` (Microsoft + encryption key)  

or  

`Owner approvals complete: A, B, C, D`
