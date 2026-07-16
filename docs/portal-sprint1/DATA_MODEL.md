# Client Portal — Admin Data Model

## Entities & relationships

```text
Client 1──* User (via clientIds)
Client 1──1 Advisor (advisorId)
Client 1──* Engagement
Client 1──* FundingRequest
Client 1──* DocumentRequest ──> Folder (catalog)
Client 1──* Task
Client 1──* MessageThread 1──* Message
Client 1──* Notification
Client 1──* SecureFile
```

## Permissions matrix (MVP)

| Capability | ClientContact | Advisor | Admin |
|------------|---------------|---------|-------|
| Switch assigned clients | Yes (own clientIds) | Assigned | All |
| View engagement (client-safe) | Yes | Yes | Yes |
| View funding stages / targets | Yes | Yes | Yes |
| Upload requested docs | Yes | Yes | Yes |
| Messaging | Yes | Yes | Yes |
| View fees / margins / AI queues | **No** | Internal apps only | Internal |
| Invite guests / enable sharing | **No** | **No** | Owner + BL-C1 |

## Status values

- Engagement client: Active | Onboarding | Paused | Closed
- Document: Requested | Uploaded | In Review | Accepted | Rejected
- Task: Open | In Progress | Done
- Funding: 11-stage enum (see Architecture)

## Scale notes

- Workspace switcher is O(clients assigned to user)
- Folder taxonomy is shared; requests are per-client rows
- Future SharePoint mapping: one library / data room per ClientCode (existing HVCG pattern)
