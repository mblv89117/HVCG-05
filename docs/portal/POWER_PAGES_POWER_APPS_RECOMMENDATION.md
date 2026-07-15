# Power Pages vs Power Apps — recommendation

## Verdict

| Need | Recommendation |
|------|----------------|
| **Client-facing authenticated portal** | **Power Pages** + Entra External ID (or Azure AD B2B guests) |
| **Staff administration of portal & data rooms** | **Power Apps canvas** on Command Center (ship first) |
| **Secure file storage** | SharePoint libraries (already SOR) — not Dataverse file columns |

## Why Power Pages for clients

1. External identity / capacity model fits guest clients better than sharing the internal canvas app.
2. Page-level security and web roles map cleanly to `PortalAccess.AccessLevel` (Read / Upload / Approve).
3. Aligns with `VERSION2_ROADMAP` Theme A and `docs/licensing/LICENSING.md` (Power Pages currently deferred for cost).
4. Keeps internal app lighter (ARCHITECTURE_REVIEW: subset datasources per screen).

## Why not Power Pages in this Dev package

- Licensing / capacity not assumed purchased.
- External sharing remains disabled in Dev.
- A014 / A020: portal deferred; entities prepared now.

## Staff Power Apps (implement now)

Screens (specs under `src/power-apps/screens/`):

- `scrPortalAdmin` — client PortalEnabled toggles, publish status, deliverable links
- `scrDataRooms` — room registry, templates, participant planning
- Existing `scrDocRequests` — honour PortalVisible + DataRoomId

Named formulas (portal module file): filter helpers that **always** AND `PortalEnabled`.

## Hybrid sequence (owner)

1. Dev: staff canvas + schema only (this package).
2. Owner: P-4 org sharing approval when ready for real guests.
3. Purchase Power Pages capacity / configure External ID.
4. Bind Pages to filtered SharePoint lists via portal web API / virtual tables as chosen.
5. Never expose fee fields or PortalAuditLog.

## Anti-patterns

- Embedding the full HVCG OS canvas for clients
- Anonymous Power Pages pages for documents
- Using Teams / email as the only “portal” without SharePoint ACL alignment
