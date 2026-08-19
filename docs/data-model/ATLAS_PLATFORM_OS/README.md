# Atlas Platform OS — Canonical Data Layer

**Owner:** Data Engineering (`data-engineering`)  
**Layer version:** `platform-os-1.0.0-draft`  
**Updated:** 2026-07-20  
**Status:** Design — **not promoted** (Architecture, Power Platform, Knowledge Platform, AI Governance, Master PM, Security, QA, owner)

## Purpose

Evolve Atlas from a product data pack into a **reusable operating-system data platform**.

**Priority order**

1. **Canonical platform entities** (this pack)  
2. Product extensions (CRM, capital, EV, finance ops) — see [`../ATLAS_DATA_FOUNDATION/`](../ATLAS_DATA_FOUNDATION/)  
3. Module UI / flows / agents that *consume* platform entities — never fork schemas

## Layering

```
┌─────────────────────────────────────────────┐
│  Product modules (CRM, Capital, EV, …)      │  extend / reference platform
├─────────────────────────────────────────────┤
│  ATLAS PLATFORM OS (canonical entities)     │  ← this pack
├─────────────────────────────────────────────┤
│  Identity & tenancy (Entra + Tenant keys)   │
└─────────────────────────────────────────────┘
         │
   Physical stores: SharePoint Lists (V1) · Dataverse hvcg_atlas* (target)
   Documents: SharePoint Libraries · Graph DriveItem links
```

## Pack contents

| Doc | Description |
|-----|-------------|
| [01_CANONICAL_ENTITIES.md](01_CANONICAL_ENTITIES.md) | Single entity per concept |
| [02_DEPRECATION_MAP.md](02_DEPRECATION_MAP.md) | Collapse duplicates → canonical |
| [03_PLATFORM_ERD.md](03_PLATFORM_ERD.md) | Relationship diagram |
| [04_COMPATIBILITY.md](04_COMPATIBILITY.md) | Dataverse / SharePoint / Power Platform / Graph |
| [05_TENANT_ISOLATION.md](05_TENANT_ISOLATION.md) | Tenant + org + workspace isolation |
| [06_MIGRATION_AND_ROLLBACK.md](06_MIGRATION_AND_ROLLBACK.md) | Versioned migrations |
| [07_COORDINATION_GATE.md](07_COORDINATION_GATE.md) | Required partner sign-off before promote |

## Machine-readable

- Catalog: `docs/data-model/contracts/atlas-platform.entities.json`
- Migration: `releases/migrations/20260720_002_atlas_platform_os_v1.json`
- Diff: `releases/migrations/diffs/atlas_platform_os_v1.json`
- Seed: `sample-data/atlas-platform-os/seed-manifest.json`

## Rules

1. **One canonical entity per concept** — no parallel schemas for the same idea.  
2. Product modules **reference** platform keys; they do not redefine User/Task/Approval/etc.  
3. Migrations are **versioned**, **additive-first**, with explicit **rollback**.  
4. Compatible with Dataverse, SharePoint, Power Platform, and Microsoft Graph.  
5. **Do not self-approve** schema promotion.
