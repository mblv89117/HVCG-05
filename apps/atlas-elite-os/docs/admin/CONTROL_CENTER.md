# Atlas Control Center

**Path:** `/admin`  
**Product name:** Atlas Control Center (formerly Administration Hub)

## Architecture decision

Control Center is the **unified system administration surface** in Elite OS. It consolidates existing configuration — it does not invent new business products.

| Concern | Owner of truth | Control Center role |
|---------|----------------|---------------------|
| Day-to-day delivery (clients, projects, AI insights) | Elite OS modules | Deep-link only |
| Dataverse table grids | Model-driven Command Center | Deep-link only |
| Entra identity | Microsoft Entra | Role mapping; no secret UI |
| Shared env vars / Azure | Azure Platform + Architecture | Read-only public config |
| AI policy toggles | AI Governance + existing flags | Same settings store |
| Admin mutations audit | Control Center store (v1 sample) | Full session trail |

**Coordinate before changing shared configuration:** Architecture, Elite UI, Power Platform, AI Governance, Master PM.

## Area map (21)

### Identity & access
Organizations · Users · Teams · Roles & Permissions

### Delivery
Clients · Projects

### Intelligence
AI Agents · Automation Registry · Knowledge Platform

### Platform
Integrations · Azure Resources · Dataverse · SharePoint

### Experience
Notifications · Branding · Licensing

### Governance
Security Center · AI Governance · Audit Center

### Operations
Release Center · System Health

## No duplication

Legacy routes alias into Control Center areas (e.g. `feature-flags` → Licensing, `audit-history` → Audit Center, `application-settings` → Branding). One settings store; one navigation chrome.

## UX requirements met

- Consistent secondary navigation + hub cards
- Search across all settings (nav + hub + global search)
- Role-based visibility (`canAccessAdmin` / Owner & Administrator)
- Audit trail on mutations
- Responsive layout (nav stacks under ~900px)
- Production-quality impact banners, danger confirms, toasts

## Related docs

- [Administrator guide](./ADMINISTRATOR_GUIDE.md)
- [Security review](./SECURITY_REVIEW.md)
- [QA handoff](./QA_HANDOFF.md)
