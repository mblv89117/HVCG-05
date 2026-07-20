# Atlas Control Center — Administrator Guide

**Product:** Atlas Control Center (`/admin`)  
**Audience:** HVCG Owners and Administrators  
**Data mode (v1):** Sample-backed local store — audited in-session; not live Dataverse writes.

## Purpose

Configure Atlas system settings in one place — without editing code or raw JSON. Delivery work (clients, projects, documents) stays in Elite OS modules; Control Center links to them.

## Who can open Control Center

**HVCG Owner** and **Administrator** only (`canAccessAdmin`). Others see access denied.

## Navigation

- Primary nav: **Control Center**
- Inside: sticky settings nav (searchable) + area content
- Global search includes Control Center areas

## Areas (what each consolidates)

| Area | What you manage |
|------|-----------------|
| Organizations | Orgs + business units |
| Users | Invite / activate / disable |
| Teams | Working groups |
| Roles & Permissions | Entra-mapped roles + catalog |
| Clients | Access grants + stages + referrals |
| Projects | Health rules + service/engagement types (links to Projects module) |
| AI Agents | AI-related feature flags |
| Automation Registry | Workflow prefs + Power Automate health |
| Knowledge Platform | Document categories + Documents/SharePoint links |
| Integrations | Connector health (no secrets) |
| Azure Resources | Public env URLs / IDs (read-only) |
| Dataverse | Org URL + model-driven deep-link |
| SharePoint | Site URL (read-only) |
| Notifications | Firm prefs + inbox link |
| Branding | Product name, locale, naming prefix |
| Licensing | Premium/portal-related flags |
| Security Center | Permission catalog + fee visibility + comms posture |
| AI Governance | AI settings (no API keys) |
| Audit Center | Mutation history |
| Release Center | Environment gates (read-only; no self-release) |
| System Health | Entra presence + integration issues |

## Safe practices

- Confirm high-impact actions (disable user, outbound flags, fee visibility).
- Do not expect credential fields — rotate secrets in Entra / Key Vault.
- Coordinate shared config changes with Architecture, Elite UI, Power Platform, AI Governance, and Master PM.

## Related

- [Control Center architecture](./CONTROL_CENTER.md)
- [Security review](./SECURITY_REVIEW.md)
- [QA handoff](./QA_HANDOFF.md)
