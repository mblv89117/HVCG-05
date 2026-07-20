# Track 10 — Security permissions matrix (Development)

## Runtime actors (Elite OS)

| Actor | Entra | Dataverse | SharePoint | Graph | Power Automate | Notes |
|-------|-------|-----------|------------|-------|----------------|-------|
| Manny (owner) | User | Read/write Atlas tables (Dev) | Read Dev docs library | User.Read, Sites/Files/Calendar read | Invoke Dev flows | No Mail.Send |
| Atlas Elite SPA | Public client | Via user token | Via user token | Via user token | HTTP trigger + user context | No secrets |
| Model-driven admin | User | Full maker/admin as today | N/A | N/A | N/A | Retained |
| Service principals | None in SPA | Not used by Elite UI | Not used | Not used | Flow connectors only | Prefer user-delegated |

## Product roles (required validation set)

| Product role | Entra mapping | Elite Exec Home | HVCG WS | Client WS (e.g. CCB) | Docs | AI | Admin |
|--------------|---------------|-----------------|---------|----------------------|------|-----|-------|
| HVCG Owner | `HVCG-Role-Owner` | Full | Full | Full (assigned) | Per policy | Assigned | Yes |
| HVCG Team Member | Role-* staff groups | Per assignment | Per assignment | Only if `HVCG-Client-{Code}` | Scoped | Assigned clients | No |
| Client Executive | B2B + client group | None | None | Own client only | Own lib | Own client | No |
| Client Team Member | B2B + client group | None | None | Own client R/limited | Own lib | Own client | No |
| Read-Only Advisor | `HVCG-Role-ReadOnlyReviewer` / ExternalProfessional | Read | Read | Permitted clients R | R | Permitted | No |
| Administrator | `HVCG-Role-Administrator` | Edit | Edit | Edit | Edit | Staff scope | Yes |

**Enforcement note (2026-07-20):** Elite OS authenticates via Entra but does **not** yet map groups to these roles (UI may label any signed-in user as Owner). Treat multi-role UAT as blocked until remediated — see [PRODUCT_SECURITY_REVIEW_EXECUTIVE_DASHBOARD.md](PRODUCT_SECURITY_REVIEW_EXECUTIVE_DASHBOARD.md).

## Hard blocks

- Production Dataverse / Production SharePoint: **out of scope** for Dev agent deploy
- Live client email / Teams client notify / portal invites: **blocked**
- Embedding secrets in git: **forbidden**
- Invented Colorado Craft Beef financial KPIs: **forbidden**
- Anonymous SharePoint links on confidential client records: **forbidden**
- AI access beyond the signed-in user’s authorized ClientCode set: **forbidden**
- Colorado Craft Beef non-Owner access without provisioned `HVCG-Client-{Code}` + library ACL: **forbidden** (today: catalog demo only — no ACL artifact)
