# Security review — Client Portal & Secure Data Rooms

**Reviewer role:** Module author (offline)  
**Scope:** Repo package 1.1.0-portal  
**Date:** 2026-07-15

## Summary

**Acceptable for Dev schema staging.** External access remains disabled by default. No guest invite automation. Residual risk is owner misconfiguration after unlock — mitigated by approvals + audit.

## Controls verified

| Control | Evidence |
|---------|----------|
| External sharing default Disabled | DataRooms schema, library template, templates/data-rooms/* |
| ExternalAccessAllowed false | Clients additive + DataRooms |
| InviteSent false / no Graph invite | Participants schema + AccessChangedAudit + NotificationStub |
| Anonymous links denied | HVCG_DataRoomLibrary.template.json |
| PortalEnabled false | Clients existing + room-level flag |
| Fee / AI leakage | Visibility docs forbid client-safe contamination |
| CRM / deployment isolation | No edits; recommendations only |
| Flow Off by default | All five portal flows |

## Threats considered

| Threat | Mitigation |
|--------|------------|
| Accidental guest invite from flow | Forbidden outboundPolicy; InviteSent default false; audit block |
| Anonymous link leakage | Library denyAnonymousLinks; SOP ExternalShare |
| Portal shows fees | PortalVisible + ClientSafe* fields; app filters |
| Cross-client data | ClientCode isolation; broken inheritance |
| Concurrent branch wipe | Module exclusive on `cursor/client-portal-data-rooms` |

## Residual risks

1. Owner sets PortalEnabled=true before Pages/auth ready — staff-only risk until Pages exist.
2. Manual SharePoint UI could create shares outside flows — SOP + Purview still required.
3. Shared `_index.json` not updated until integrator merge — repair must use migration diff.

## Verdict

**PASS (Dev package)** — do not unlock external access or Production without separate security sign-off (P-4).
