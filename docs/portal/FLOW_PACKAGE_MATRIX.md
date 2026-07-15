# Client Portal & Data Rooms — Flow package matrix

All flows ship `defaultState: Off`. **No client emails, guest invites, or share-link creation.**

**Package:** 1.1.0-portal  
**Module index:** `src/power-automate/flows/portal/_module_index.json`

| # | Flow | Trigger | Outbound |
|---|------|---------|----------|
| 1 | `HVCG_PortalPublishStatusUpdate` | StatusUpdates IsPublished=true | Client email blocked unless `HVCG_PORTAL_ENABLE_CLIENT_NOTIFY` |
| 2 | `HVCG_PortalPublishDeliverableLink` | Deliverables PortalVisible=true | None |
| 3 | `HVCG_DataRoomProvisionStub` | Manual | Forces ExternalSharingMode=Disabled |
| 4 | `HVCG_PortalAccessChangedAudit` | Access/Participants modified | Blocks invite flags |
| 5 | `HVCG_PortalClientNotificationStub` | Manual | Always no-op when flag false |

## Activation (Dev only)

1. Apply migration `20260715_002_client_portal_data_rooms`
2. Import five flows; leave **Off**
3. Enable AccessChangedAudit → DataRoomProvisionStub → publish flows
4. Do not set notify flag without owner approval

## Forbidden

- Editing CRM flow packages
- Enabling tenant external sharing
- Production import without owner gate
