# Capital lender intelligence (B1/B5)

**Code:** `packages/atlas-capital-core/src/matching.ts`  
**Lists (reuse only):** `HVCG_Lenders`, `HVCG_LenderOutreach`  
**Designed, not provisioned:** `HVCG_LenderProducts` — do not create it. Org-only live matching stays `UNKNOWN`.  
**Contracts:** [CAPITAL_PHASE2_CONTRACTS.md](CAPITAL_PHASE2_CONTRACTS.md)

Matching is decision support for Manny. It is not a credit decision, not an allocator, and not VERIFIED underwriting policy.

---

## Inventory (no new lists)

| Grain | List | Used for matching |
|-------|------|-------------------|
| Organization | `HVCG_Lenders` | Name, `LenderType`, `RelationshipStatus`, `RelationshipOwner`, `Geography`, `LastVerifiedAt`, `CriteriaFreshness`, `VerificationSource`. `PreferredProducts` / `TypicalAdvanceRate` / `CovenantStyle` / `Notes` stay unstructured sourced text. |
| Product | `HVCG_LenderProducts` | Stated numeric/flag criteria only (`MinAmount`, `MaxAmount`, `MinRevenue`, `TimeInBusinessMonths`, industries, geography, appetite booleans). Blank = unknown, not “no restriction.” |
| Outreach | `HVCG_LenderOutreach` | Historical HVCG experience. Context. Never an automatic fit. |

`Do Not Contact` is excluded before scoring (`RelationshipStatus`). Inactive/Prospect remain in the universe.

`HVCG_Lenders` has `VerificationSource` but not `VerifiedBy`. Honest org CURRENT uses that source field; it does not invent a verifier.

---

## Bands

`BEST_FIT | POSSIBLE | LOW_FIT | INELIGIBLE | UNKNOWN`

- **BEST_FIT** only when product criteria are honestly `CURRENT` (source + verified-by + `LastVerifiedAt` within 180 days), stated hard criteria are met, and required client facts are present and `VERIFIED`.
- **INELIGIBLE** only from a stated rule (amount vs min/max, restricted industry, explicit `false` appetite). Missing flags are unknown, not invented as no.
- **STALE** or **UNKNOWN** criteria cannot produce `BEST_FIT` (or POSSIBLE / LOW_FIT). They land `UNKNOWN` unless a stated rule already makes the row `INELIGIBLE`.
- No percent / fit scores. `Confidence` on the product row is a sourced 0–1 note, not a match rank.

Every explanation carries a `SourceRef` (`sourceSystem`, `field`, `capturedAt`). Match runs include `FINANCING_DISCLAIMER` and stay `PENDING_MANNY`.

---

## What matching will not do

- Parse `PreferredProducts`, `CreditExpectations`, `Notes`, or similar prose into numeric boxes
- Treat DSCR / leverage / FICO text as VERIFIED policy when the opportunity has no sourced client field to compare
- Promote AI or historical outreach into a fit
- Create SharePoint lists or seed real ACCG/Prodigy lender contacts
