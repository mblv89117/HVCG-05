# Migration plan (Development) — Client Portal / Data Rooms

## Package

- Migration: `releases/migrations/20260715_002_client_portal_data_rooms.json`
- Diff: `releases/migrations/diffs/client_portal_data_rooms_v1.json`
- Semver: remains 1.1.0 (additiveOnly)

## Preconditions

- Dev SharePoint baseline present
- Owner-attended interactive PnP sign-in
- Merge `src/sharepoint/lists/portal/_module_index.json` entries into shared `_index.json` (recommendation) **or** run ApplyListDiff directly from migration file
- No concurrent repair from CRM/other agents

## Apply (owner only)

```powershell
pwsh -File ./deployment/backup/Backup-HVCGOS.ps1 -Environment development
pwsh -File ./deployment/repair/Repair-HVCGOSSharePointSchema.ps1 -Environment development
```

Expect new lists: DataRooms, DataRoomParticipants, PortalStatusUpdates, PortalAuditLog; additive columns on Clients/Milestones/Portal*.

## Do not

- Flip `secureDataRooms.enabled`
- Enable org external sharing
- Import flows to Production
- Invite guests
