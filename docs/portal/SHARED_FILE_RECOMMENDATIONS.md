# Shared file merge recommendations (Portal module)

**Branch:** `cursor/executive-command-center`  
**Module:** ClientPortalDataRooms  

This module **does not modify** shared indexes, root permissions, deployment, auth, environment JSON, or CRM flows. Integrators should apply the following merges when safe.

## Do not touch (owned elsewhere / forbidden)

| Path | Reason |
|------|--------|
| `deployment/**` | Deployment agent / owner only |
| `deployment/scripts/Register-HVCGPnPEntraApp.ps1` and auth docs | Authentication |
| `config/environments/*.json` | Env ownership; `secureDataRooms.enabled` must stay false unless owner flips |
| `src/power-automate/flows/HVCG_LeadQualified*` and other CRM flows | CRM deployment agent |
| `docs/crm/**` | CRM module |
| `docs/executive/**` | Parallel executive work on same branch — leave alone |

## Recommended merges (additive)

### 1. `src/sharepoint/lists/_index.json`

Append entries from `src/sharepoint/lists/portal/_module_index.json` for:

- `HVCG_DataRooms`
- `HVCG_DataRoomParticipants`
- `HVCG_PortalStatusUpdates`
- `HVCG_PortalAuditLog`

Bump index `version` comment if your process requires it.

### 2. Existing list JSON column sync

After migration apply, mirror additive columns into:

- `HVCG_Clients.json` — `ExternalAccessAllowed`, `DataRoomEnabled`, `PortalNotificationMode`
- `HVCG_Milestones.json` — `PortalVisible`, `ClientSafeLabel`, `ClientSafeNotes`
- `HVCG_Deliverables.json` — `ClientSafeTitle`
- `HVCG_DocumentRequests.json` — `DataRoomId`
- `HVCG_PortalAccess.json` — `DataRoomId`, `InviteMode`, `ExternalSharingBlocked`
- `HVCG_PortalDeliverableLinks.json` — `ClientCode`, `ExpiresOn`, `RequiresAcknowledgement`
- `HVCG_PortalMessages.json` — `IsPublished`

Source of truth until then: `releases/migrations/diffs/client_portal_data_rooms_v1.json`.

### 3. `src/power-automate/flows/_index.json` + `definitions/_index.json`

Append portal flow names from `docs/portal/FLOW_PACKAGE_MATRIX.md` / `src/power-automate/flows/portal/_module_index.json` when integrating. Do **not** reorder or edit CRM entries.

### 4. Root `PERMISSIONS_MATRIX.md`

Append a section pointing to `docs/portal/PERMISSIONS_MATRIX.md` or copy that table under “Client Portal / Data Rooms”.

### 5. Optional env note (do not flip flags)

Document only — keep:

```json
"secureDataRooms": { "enabled": false }
```

### 6. Conflict with `docs/executive/**` on this branch

Another stream is writing Executive Command Center docs on `cursor/executive-command-center`. Portal artifacts stay under `docs/portal/**` and `src/**/portal/**` to avoid collision.
