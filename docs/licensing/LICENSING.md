# LICENSING — Version 1 Approach

## Baseline Assumption

Staff use **Microsoft 365 Business Premium** (SharePoint, Teams, Exchange, Intune, Entra ID P1 capabilities as included).

## V1 Included (no additive premium required)

| Capability | Product |
|------------|---------|
| Lists / libraries | SharePoint Online |
| Canvas apps for M365 data | Power Apps for Microsoft 365 |
| Standard connector flows | Power Automate for Microsoft 365 |
| Teams / Outlook | Included |
| Forms / Bookings | Typically included with M365 |

## Evaluated Premium Options (Deferred)

| Product | Why considered | Benefit | Est. impact | Non-premium alternative | V1 recommendation |
|---------|----------------|---------|-------------|---------------------------|-------------------|
| Dataverse | Stronger data layer | Relational integrity, security roles | Per-user Power Apps premium | SharePoint Lists | **Defer** |
| Premium PA connectors | HTTP+/SQL etc. | Integration | Per-flow or per-user | Standard SP/Outlook/Teams | **Defer** |
| Power Pages | Client portal | Client self-service | Capacity packs | Secure links + email | **Defer** |
| Copilot Studio | AI agents | Drafts/summaries | Message packs | Manual + future Graph | **Defer** |
| Power BI Pro | Dashboards | Executive visuals | ~$10/user/mo | Excel + list views | **Optional — OA-007** |
| Azure Functions | Custom compute | Complex logic | Consumption $ | Power Automate | **Defer** |
| Key Vault | Secrets | Secure certs | Low | Local secure store for V1 scripts | **Optional at app-reg time** |

## Recommendation

Ship V1 on Business Premium + optional Power BI Pro for 1–2 users. Do not purchase Dataverse or Power Pages until OA decision after 90 days of production use or list scale concerns.
