# Client Portal & Data Rooms — Permissions Matrix

Legend: **F** Full · **E** Edit · **R** Read · **N** None · **A** Assigned ClientCode only · **P** Portal client contact (future; currently N)

| Resource | Owner | Admin | Ops Mgr | PM | Capital | Analyst | Ops Asst | Contractor | Ext Pro | ReadOnly | Client Contact |
|----------|-------|-------|---------|----|---------|---------|----------|------------|---------|----------|----------------|
| HVCG_DataRooms | E | E | E | E | E | R | R | A | N | R | **N** |
| HVCG_DataRoomParticipants | E | E | E | E | E | R | R | N | N | N | **N** |
| HVCG_PortalStatusUpdates | E | E | E | E | E | R | E | N | N | R | **P*** |
| HVCG_PortalAuditLog | E | E | R | R | N | N | N | N | N | N | **N** |
| HVCG_PortalAccess | E | E | E | E | R | N | R | N | N | N | **N** |
| HVCG_PortalMessages | E | E | E | E | R | N | E | N | N | N | **P*** |
| HVCG_PortalDeliverableLinks | E | E | E | E | E | R | E | N | N | R | **P*** |
| Data room library (default) | E | F | E | E | E | A | A | A | N | A | **N** |
| Data room library (guest unlock) | — | — | — | — | — | — | — | — | — | — | **R/Upload only after owner unlock** |
| DocumentRequests (portal filter) | E | E | E | E | E | E | E | A | A | R | **P*** |
| Deliverables PortalVisible | E | E | E | E | E | E | E | A | A | R | **P*** |
| Milestones PortalVisible | E | E | E | E | E | R | E | A | N | R | **P*** |

\* **P** = Power Pages / authenticated external identity **after** `PortalEnabled` and licensing — **not active in this package**. Until then treat as **N**.

## Field-level (app enforced)

Hide from all portal / client surfaces:

- Fees, margins, profitability, InternalNotes
- `PortalAuditLog` entire list
- DataRoomParticipants with ParticipantType Guest/Lender/Investor while InviteSent false (staff planning only)
- Any row where `PortalVisible=false` or unpublished status updates

## External sharing controls

| Control | Required value until owner unlock |
|---------|-----------------------------------|
| Library `externalSharingMode` | Disabled |
| Anonymous links | Denied |
| Organization-wide links | Denied |
| Auto guest invite from flows | Forbidden |
| Participant `ExternalInviteAllowed` | false |
| Approval before any SpecificPeople share | `HVCG_Approvals.ApprovalType = ExternalShare` |

## Role summary

| Role | Portal admin | Publish status | Plan guests | Unlock external |
|------|--------------|----------------|-------------|-----------------|
| Owner | Yes | Yes | Yes | Yes (after P-4) |
| Admin | Yes | Yes | Yes | Yes (after P-4) |
| Ops Mgr | Yes | Yes | Yes | Recommend only |
| PM | Yes | Yes | Plan only | No |
| Capital | Rooms they own | Limited | Plan lenders | No |
| Client Contact | Future portal read/upload | No | No | No |
