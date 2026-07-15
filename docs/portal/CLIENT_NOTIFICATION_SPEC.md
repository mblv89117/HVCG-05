# Client notification specifications

**Feature flag:** `HVCG_PORTAL_ENABLE_CLIENT_NOTIFY` (default **false**)  
**Client field:** `PortalNotificationMode` = Disabled | StaffOnly (default) | ClientEmailQueued

## Principles

1. Publishing ≠ notifying.
2. No client email while flag is false.
3. Data room invites are **forbidden** in this package (`ExternalInviteBlocked`).
4. AI paths never trigger sends (ExternalSendBlocked).

## Kinds

| Kind | Default when flag false |
|------|-------------------------|
| StatusUpdatePublished | Audit NotificationBlocked; QueuedStaffOnly / BlockedExternal |
| DeliverableAvailable | BlockedExternal |
| MilestoneAchieved | BlockedExternal |
| DataRoomInvite | Always blocked |

## Acceptance

- [ ] Flag false + NotifyClient=true → no Outlook send
- [ ] PortalAuditLog row with EventType NotificationBlocked
