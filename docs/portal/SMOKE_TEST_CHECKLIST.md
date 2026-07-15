# Smoke test checklist — Portal / Data Rooms (Development)

## Prerequisites

- [ ] Migration `20260715_002` applied
- [ ] Lists DataRooms, DataRoomParticipants, PortalStatusUpdates, PortalAuditLog exist
- [ ] Flows imported **Off**
- [ ] `HVCG_PORTAL_ENABLE_CLIENT_NOTIFY` unset/false

## Cases

| # | Step | Expected |
|---|------|----------|
| 1 | Create DataRoom via stub or list | Status=Draft; ExternalSharingMode=Disabled; ExternalAccessAllowed=false |
| 2 | Add Planned participant | InviteSent=false; ExternalInviteAllowed=false |
| 3 | Draft status update; publish | IsPublished stamps; audit StatusUpdatePublished |
| 4 | NotifyClient=true on publish | NotificationStatus BlockedExternal or QueuedStaffOnly; **no email** |
| 5 | Set Deliverable PortalVisible | PortalDeliverableLink upserted; no share link auto-created |
| 6 | Client PortalEnabled remains false | Staff admin only; no client surface |
| 7 | Confirm site sharing still Disabled (Dev) | Owner checks SPO sharing settings unchanged |

## Sign-off

Offline PASS: ____  Smoke PASS: ____  Owner: ____
