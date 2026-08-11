# Business configuration (canonical)

Authority: [CR-HVCG-BA-V2-001](../../PROJECT_ATLAS/ChangeRequests/CR-HVCG-BA-V2-001.md)

| File | Role |
|------|------|
| `hvcg-v2-requirements.json` | Requirements traceability machine SoR |
| `service-lines.json` | Seven HVCG service lines |
| `offer-catalog.json` | Thirteen productized offers (enriched) |
| `offer-decision-engine.json` | Deterministic need → offer rules |
| `offer-grid.json` | One-page internal sales grid |
| `diagnostics.json` | Paid diagnostic front door levels |
| `pricing-rate-card-v2.json` | **PROPOSED** V2 rate card (does not supersede BL-P1) |
| `pricing_policy.py` | Legacy lock + price-state helpers |
| `commercial_rules.py` | Progressive commercial validation |
| `qualification-checklist.json` | Internal sales qualification |
| `proposal-archetypes.json` | Three proposal templates index |
| `compliance-language.json` | Versioned disclaimers + out-of-scope |
| `do-not-sell-cheap.json` | Margin protection guidance |
| `positioning.json` | Canonical brand/commercial message |
| `website-messaging.json` | Prepared public messaging (not published) |
| `content-and-acquisition.json` | Pillars, ladder, lead magnets, sources |
| `folder-taxonomy-map.json` | Legacy 00–23 ↔ V2 00–13 mapping |
| `client-migration-seed.json` | Initial migration records |
| `hvcg-agents-v2.json` | Eighteen agent configuration stubs |

UI and proposals must read these sources. Do not hard-code prices in React components.

Human docs: [HVCG_V2_REQUIREMENTS_TRACEABILITY.md](../../PROJECT_ATLAS/BUSINESS/HVCG_V2_REQUIREMENTS_TRACEABILITY.md) · [HVCG_COMMERCIAL_PLAYBOOK.md](../../PROJECT_ATLAS/BUSINESS/HVCG_COMMERCIAL_PLAYBOOK.md)
