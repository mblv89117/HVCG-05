# Track 10 — Security permissions matrix (Development)

| Actor | Entra | Dataverse | SharePoint | Graph | Power Automate | Notes |
|-------|-------|-----------|------------|-------|----------------|-------|
| Manny (owner) | User | Read/write Atlas tables (Dev) | Read Dev docs library | User.Read, Sites/Files/Calendar read | Invoke Dev flows | No Mail.Send |
| Atlas Elite SPA | Public client | Via user token | Via user token | Via user token | HTTP trigger + user context | No secrets |
| Model-driven admin | User | Full maker/admin as today | N/A | N/A | N/A | Retained |
| Service principals | None in SPA | Not used by Elite UI | Not used | Not used | Flow connectors only | Prefer user-delegated |

## Hard blocks

- Production Dataverse / Production SharePoint: **out of scope**
- Live client email / Teams client notify / portal invites: **blocked**
- Embedding secrets in git: **forbidden**
