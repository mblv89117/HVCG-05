# Integration Permissions & Scopes

## Microsoft Graph (delegated — Read-Only Discovery)

| Scope | Used for |
|-------|----------|
| `openid` `profile` `offline_access` | Identity + refresh tokens |
| `User.Read` | Connection verify (`/me`) |
| `Mail.Read` | Search/read mail, threads, attachments (download) |
| `Calendars.Read` | Calendar events |
| `Contacts.Read` | Contacts |
| `Files.Read.All` | OneDrive / drive items |
| `Sites.Read.All` | SharePoint sites & libraries |

**Not requested by default:** `Mail.Send`, `Mail.ReadWrite`, `Files.ReadWrite*`, `Sites.ReadWrite.All`, application permissions.

## Google (Read-Only Discovery)

| Scope | Used for |
|-------|----------|
| `gmail.readonly` | Search/read mail & attachments |
| `drive.readonly` | Files/folders metadata & download |
| `calendar.readonly` | Events |
| `contacts.readonly` | Contacts |

## GitHub App

| Permission | Access | Mode |
|------------|--------|------|
| Metadata | Read | Always |
| Contents | Read | Read-Only |
| Issues | Read | Read-Only |
| Issues | Read & write | Workflow Execution (Atlas-created only) |
| Pull requests | Read | Read-Only |
| Actions | Read | Read-Only |
| Discussions | Read | Read-Only |
| Projects | Read | Read-Only |

Repository selection is mandatory — do not grant all repositories by default.

## Elevation process

1. Document business need  
2. Owner approval (elevated mode)  
3. Update Entra / Google / GitHub permission grants  
4. Reauthorize connection  
5. Change connection `permissionMode`  
6. Audit log records the change  
