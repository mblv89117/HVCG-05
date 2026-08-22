# Business configuration (canonical)

In-tree Atlas business-architecture engines. The Integration Hub is the only public API and calls the isolated Business Analyst HTTP service, which imports this directory. `ba_bridge.py` remains the local stdin engine entrypoint. Do not resolve sibling worktrees.

Python: stdlib only. Target CI: Python 3.11. Local stores under `.data/` are development adapters, not production systems of record.

Authority: CR-HVCG-BA-V2-001.

| File | Role |
|------|------|
| `revenue_conversion.py` | Sprint 3 conversion / pricing / proposal / BL-C1 services |
| `free-fit-assessment.json` | SKU-FRA Free Fit policy (owner ADR-BA-V2-002) |
| `elite-revenue-commercial-surface.json` | Elite UI progressive disclosure contract |
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
