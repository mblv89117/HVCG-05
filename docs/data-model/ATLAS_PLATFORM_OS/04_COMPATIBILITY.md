# 04 — Compatibility Matrix

Platform entities must remain usable across Microsoft surfaces without forked models.

| Concern | SharePoint Lists | Dataverse | Power Platform | Microsoft Graph |
|---------|------------------|-----------|----------------|-----------------|
| Structured SoR (V1) | Primary | Target (`hvcg_atlas*`) | Apps/flows read/write via connectors | Not SoR for ops rows |
| Documents / files | Libraries | File columns optional; prefer Graph ids | — | **DriveItem** SoR for bytes |
| Identity | Email + EntraObjectId on Identity/User | AAD user lookup columns | Dataverse users / Entra | **User**, SP, Group |
| Permissions | List ACL + app Role/Permission | Security roles + team | Same | Group membership |
| Approvals | Approval entity | Same | Approvals connector **links** to ApprovalKey | — |
| Automations | Automation catalog + flow name | Same | Flow definition is runtime; catalog is metadata | — |
| Notifications | Notification entity | Same | Send via Teams/Outlook actions | Chat/Mail send APIs |
| Metrics / Dashboards | Metric, Dashboard, Widget lists | Same | Canvas/custom pages bind keys | — |
| Audit | Append-only Audit list | Same + auditing | — | Purview (complement, not duplicate business Audit) |

## Naming

| Layer | Convention |
|-------|------------|
| Logical | PascalCase entity (`Task`, `Approval`) |
| SharePoint list | `HVCG_<Plural>` unless canonicalizing existing |
| Dataverse table | `hvcg_atlas<logical>` lowercase |
| Graph | Use native ids (`id`, `driveItemId`); store as text on Document/Artifact |

## Connector rules

1. Power Automate flows **reference** `AutomationCode` / `WorkflowCode`; they do not own a second task store.  
2. Graph mail/Teams payloads write **Notification** or **Conversation** rows — not ad-hoc lists.  
3. Dataverse solutions package platform tables separately from product extensions.  
4. SharePoint list internal names stay stable; Dataverse publish is additive mapping via migration pack.
