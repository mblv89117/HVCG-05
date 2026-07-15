# Secure Data Rooms

## Definition

A **data room** is a ClientCode-isolated SharePoint document library created from `HVCG_DataRoomLibrary.template.json`, registered in `HVCG_DataRooms`, with folder packs from `templates/data-rooms/*.json`.

It is **not** enabled site-wide. Config `sites.secureDataRooms.enabled` remains `false` in environment examples (untouched by this module).

## Lifecycle

```text
Draft → Staging → Active → Locked → Archived
```

| Status | Staff | Client portal | External guests |
|--------|-------|---------------|-----------------|
| Draft | Full | No | No |
| Staging | Full | No | No |
| Active | Full | Only if room+client PortalEnabled | Only if ExternalAccessAllowed + SpecificPeople + approval |
| Locked | Read/Edit owners | Frozen downloads | Revoke non-staff |
| Archived | Read | No | No |

## Templates

| Key | RoomType | Use |
|-----|----------|-----|
| `diligence-standard` | Diligence | Engagement document collection |
| `lender-package` | LenderPackage | Lender-facing package staging |
| `investor-package` | InvestorPackage | Investor package staging |
| `transaction-close` | Transaction | Closing binders |

All templates ship with `externalSharingMode: Disabled`, `externalAccessAllowed: false`, `portalEnabled: false`.

## Naming

```text
LibraryName = HVCG_DR_{ClientCode}_{RoomKey}
HVCG_IdempotencyKey = dataroom|{ClientCode}|{TemplateKey}|{RoomKey}
```

## Relationship to client document libraries

| Artifact | Purpose |
|----------|---------|
| `HVCG_{ClientCode}` client library | Day-to-day engagement docs (folders 00–23) |
| `HVCG_DR_*` data room library | Curated diligence / lender / investor subset |

DocumentRequests may optionally link `DataRoomId` when uploads should land in a room folder rather than the general client library.

## Provisioning policy (Dev)

Automation (`HVCG_DataRoomProvisionStub`) may **register list items** and emit staging checklist audit events. It must **not**:

- Create guest users
- Change tenant/site sharing settings
- Set `InviteSent=true`
- Enable the Data Rooms site

Physical library creation remains owner-attended (PnP) until deployment ownership merges the optional script recommendation.
