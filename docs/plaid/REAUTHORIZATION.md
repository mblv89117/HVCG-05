# Reauthorization Support Procedure

## User-facing states

| Status | Meaning | Action |
|--------|---------|--------|
| Connected | Healthy | Refresh available |
| Syncing | Sync in progress | Wait |
| Needs Reauthorization | Plaid ITEM_LOGIN_REQUIRED / pending expiration | Click **Reconnect** |
| Error | Sync/API failure | Refresh; if persists contact advisor |
| Disconnected | User or admin removed Item | Connect again |

## Operator steps

1. Confirm webhook `ERROR` / `PENDING_EXPIRATION` in audit logs (no secrets).  
2. Ask client to open Bank Connections → Reconnect.  
3. New Link session updates Item; trigger sync.  
4. Verify status returns to Connected.
