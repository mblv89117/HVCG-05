# Lender Intelligence Model

**As of:** 2026-08-17  
**Code:** `packages/atlas-capital-core/src/matching.ts`  
**Lists:** `HVCG_Lenders`, `HVCG_LenderProducts`, `HVCG_CapitalSources`  
**Rule:** Never invent criteria. Stale or missing criteria cannot produce `BEST_FIT`.

This is decision support for Manny. It is not an automated allocator and not a credit decision.

---

## Objects

| Object | List | Holds |
|--------|------|--------|
| Organization | `HVCG_Lenders` (+ optional `HVCG_CapitalSources`) | Name, type, website, geography, relationship, freshness |
| Product | `HVCG_LenderProducts` | Amount/revenue bands, industry prefer/restrict, appetite flags, docs, pricing notes, verification |
| Match | Computed (not a SoR list) | `BEST_FIT \| POSSIBLE \| LOW_FIT \| INELIGIBLE \| UNKNOWN` plus reasons and missing criteria |
| Outreach | `HVCG_LenderOutreach` | What was actually sent |
| Offer | `HVCG_CapitalOffers` | What came back |

Products are the matching grain. A lender without products cannot be `BEST_FIT`.

---

## Freshness

`CriteriaFreshness`: `CURRENT | STALE | UNKNOWN`.

`productFreshness`:

- No `lastVerifiedAt` → cannot stay `CURRENT` (becomes `UNKNOWN` if it was labeled current).
- Verified date older than **180 days** → `STALE`.

`STALE` matches are forced to `UNKNOWN` and must not rank as a definitive recommendation.

`VerificationSource` / `VerifiedBy` / `LastVerifiedAt` are required for honest CURRENT.

---

## Matching (stated criteria only)

`matchProduct` compares opportunity facts to **stated** product fields:

- Amount vs min/max (missing amount or missing min → unknown, not a guessed fit)
- Revenue only if present; verification is cited in reasons
- Restricted industry can ineligible; preferred industry is a reason, not automatic ineligible if absent
- Appetite flags (`acquisitionAppetite`, `sbaParticipation`, `arEligible`, …) ineligible only when explicitly `false`
- Missing source/verified date increases unknown

`BEST_FIT` requires `freshness === CURRENT`, no ineligibility, and not `unknown`. Otherwise the band is downgraded.

`rankMatches` sorts BEST_FIT → POSSIBLE → LOW_FIT → UNKNOWN → INELIGIBLE.

Blank product fields mean **unknown**, not “no restriction.”

---

## Relationship vs criteria

`RelationshipStatus` / `RelationshipOwner` describe HVCG’s relationship. They do not override product ineligibility. A warm relationship with STALE criteria is still UNKNOWN for matching.

---

## Strategy and shortlist

`draftStrategy` uses matches as **candidates**. `MannyApproval` starts `PENDING`. Until Manny approves, the strategy is not an HVCG recommendation and must not drive unattended outreach.

---

## What this model does not do

- Scrape or hallucinate lender boxes
- Use ACCG/Prodigy real lender contacts as seed data in-repo
- Auto-select a submission target
- Treat stated rate on an offer as effective cost (see offer comparison notes)
- Replace Manny’s judgment
