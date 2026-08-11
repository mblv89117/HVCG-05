# Cross-Worktree Integration Map — CR-HVCG-BA-V2-001

**As of:** 2026-08-11 (post Sprint 4 commits · pre Sprint 5)  
**Rule:** Commits authorized. Merge / Production deploy **NOT** authorized.

## Commit table

| Worktree | Module | Commit | Depends On | Provides | Integration Target |
|----------|--------|--------|------------|----------|-------------------|
| `hvcg-business-architecture-v2` (`cursor/hvcg-business-architecture-v2`) | BA V2 commercial SoR, schemas, conversion, requirements | `779c1bc56d66e7087e0dc6591b2213c05bae530b` | Sprint 3 `71944e1` | Catalogs, `revenue_conversion.py`, attribution taxonomy, S4 coverage/ADR/handoff, integration tests | Future owner-gated merge into Absolute GO / Elite release line |
| `revenue-pipeline-product` (`cursor/revenue-pipeline-product`) | Elite Revenue OS + commercial workbench | `6d47f0deda1569181aedb95bf5b4bd37f57f5377` | BA catalogs (snapshot sync); restored Revenue foundation | Free Fit, Diagnostic, Pricing, Proposal, Migration UI; BL-C1 UI gate | Elite Revenue surface merge later |
| `atlas-usable-operating-layer` (`fix/atlas-usable-operating-layer`) | Live Client 360 | `fbca452e2711de782aeb9233d1650d4326e8f4c6` | Absolute GO Client 360 shell | Internal Revenue + Migration Client 360 tabs | Absolute GO Elite line (Dev commit only; **no deploy**) |

## Dependencies (explicit)

### BA catalog/config dependency
- **SoR:** `config/business/*` on BA branch (`779c1bc` + earlier).
- **Consumers:** Revenue product reads **Dev snapshots** under:
  - `apps/atlas-elite-os/src/commercial/catalog/`
  - `apps/atlas-elite-os/public/ba-v2/`
- **Sync method:** Manual copy at Sprint 4 time (not generated build artifact). Re-sync when BA catalogs change before UI release merge.
- **Do not** treat React snapshots as SoR.

### Revenue product dependency
- Opportunity commercial path uses BA offer/service-line/pricing/decision/compliance JSON.
- Proposal bodies derive from BA templates mirrored in `public/ba-v2/*.md`.
- Conversion services remain Python on BA branch; UI reimplements thin TS equivalents for progressive disclosure (keep formulas aligned).

### Client 360 dependency
- Revenue/Migration sections are **internal display** adapters; they do not mutate BA catalogs.
- Financial truth buckets are UI contracts aligned to BA revenue-type distinctions (`REV-007`).
- Capital section (Sprint 5) will extend the same `Client360CommercialSections.tsx` pattern.

### Shared types/contracts
| Contract | Owner | Consumers |
|----------|-------|-----------|
| Offer codes / Service lines / Rate card IDs | BA `config/business` | Revenue UI snapshots, conversion services |
| Proposal status + BL-C1 | BA `revenue_conversion.py` + SP `HVCG_Proposals` | Revenue CommercialWorkbench |
| Attribution taxonomy | BA `attribution-taxonomy.json` | Revenue Attribution panel |
| Client 360 financial truth buckets | UOL `Client360CommercialSections.tsx` | Live Client 360 only |
| Capital readiness score (Sprint 5) | BA `capital_readiness.py` + scoring JSON | Capital workbench + Client 360 Capital |

### Generated / temporary artifacts
- **None committed** as build outputs. `node_modules` not committed.
- Catalog snapshots are intentional Dev mirrors (documented in `docs/revenue/SPRINT4_COMMIT_WIP_NOTE.md`).

### Unrelated WIP excluded
- Knowledge rail (`integrations/knowledge/*`) left out of Revenue commit.

## Expected future merge order (when Owner authorizes)

1. BA V2 branch (schemas + catalogs + engines + tests)  
2. Revenue product (UI consuming catalogs)  
3. Usable-operating-layer Client 360 sections (after Absolute GO deploy gate separately decided)  
4. Single integration PR into release line — **not** part of this authorization

## Sprint 5 build locus (executed — pending Owner commit)

| Concern | Worktree | Status |
|---------|----------|--------|
| Capital readiness engine, scoring policy, tests, agent I/O, package handoff | `hvcg-business-architecture-v2` | Dev complete, **uncommitted** |
| `/capital` workbench extension | `atlas-usable-operating-layer` | `CapitalReadinessWorkbench.tsx`, **uncommitted** |
| Client 360 Capital tab | `atlas-usable-operating-layer` | Added beside Revenue/Migration, **uncommitted** |
| Commercial offer after capital approval | BA `OFF-CAP-PKG` → Revenue proposal path | Exercised in E2E test |

## Sync / coupling notes (Sprint 5)

- Capital scoring SoR is BA `capital-readiness-scoring.json` + `capital_readiness.py`.
- Elite Capital UI uses Dev fixtures labeled as such; does not hard-code production financials.
- No catalog snapshot sync required for Capital engine (unlike Revenue BA JSON mirrors).
- Future merge order unchanged: BA → Revenue → usable-operating-layer (Owner-gated).
