# scrPortalAdmin — Staff portal administration

**Audience:** Owner, Admin, Ops Mgr, PM  
**Datasources:** Clients, PortalStatusUpdates, PortalDeliverableLinks, PortalAccess, PortalMessages, PortalAuditLog (read), DocumentRequests, Deliverables, Milestones

## Layout

1. Client picker with `PortalEnabled` badge (default Off)
2. Gates panel — PortalEnabled warn dialog; ExternalAccessAllowed display-only false
3. Status updates — Publish sets IsPublished
4. Deliverable links / Doc requests / Milestones PortalVisible editors
5. Audit rail — last PortalAuditLog rows

## Safety

Confirm on PortalEnabled: does not invite users or enable SharePoint sharing. No Invite/Share controls.
