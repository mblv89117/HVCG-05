# PortalVisible flags & visibility matrix

**Module:** ClientPortalDataRooms  
**Rule:** No client UI may query rows without these gates. Defaults keep everything staff-only.

## Master gates

| Gate | Location | Default | Meaning |
|------|----------|---------|---------|
| `PortalEnabled` | `HVCG_Clients` | `false` | Client portal surface unlocked for this client |
| `ExternalAccessAllowed` | `HVCG_Clients` (additive) | `false` | Guests/B2B allowed at all |
| `DataRoomEnabled` | `HVCG_Clients` (additive) | `false` | Data room feature flag for client |
| `PortalEnabled` | `HVCG_DataRooms` | `false` | Room metadata eligible for portal |
| `ExternalAccessAllowed` | `HVCG_DataRooms` | `false` | Room-level guest unlock |
| `ExternalSharingMode` | `HVCG_DataRooms` | `Disabled` | SharePoint sharing mode intent |

## Entity flags

| Entity | Flag | Default | Client view condition |
|--------|------|---------|----------------------|
| DocumentRequests | `PortalVisible` | `true` (existing) | AND Clients.PortalEnabled |
| Deliverables | `PortalVisible` | (existing) | AND Clients.PortalEnabled; prefer `ClientSafeTitle` |
| Milestones | `PortalVisible` | `false` (additive) | AND Clients.PortalEnabled; show `ClientSafeLabel` |
| PortalStatusUpdates | `PortalVisible` + `IsPublished` | both `false` | Both true + Clients.PortalEnabled |
| PortalMessages | `IsClientVisible` + `IsPublished` | published false | Both + PortalEnabled |
| PortalDeliverableLinks | `IsActive` | `true` | AND PortalEnabled; honour `ExpiresOn` |
| Data room files | `PortalVisible` / Sensitivity | `false` / Internal | Never via anonymous link |

## Audience (DocumentRequests)

| Audience | Portal eligible | Notes |
|----------|-----------------|-------|
| Client | Yes (if gates pass) | Primary portal checklist |
| Lender | No in client portal | Data room lender template only |
| Investor | No in client portal | Investor package room |
| Internal | Never | Staff only |

## Forbidden in client-safe fields

Success fees, profitability, InternalNotes, AI queues, Relationships cross-client, AutomationLogs, unfiltered Tasks, staff emails beyond designated PM contact.

## App filter (Power Apps / Pages)

```text
Filter(
  DocumentRequests,
  ClientCode = varClientCode &&
  PortalVisible = true &&
  LookUp(Clients, ClientCode = varClientCode).PortalEnabled = true &&
  Audience = "Client"
)
```

Status updates:

```text
Filter(
  PortalStatusUpdates,
  ClientCode = varClientCode &&
  IsPublished = true &&
  PortalVisible = true &&
  LookUp(Clients, ClientCode = varClientCode).PortalEnabled = true
)
```
