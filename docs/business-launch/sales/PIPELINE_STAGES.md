# PIPELINE_STAGES

**As of:** 2026-07-15 18:45 PT  
**Priority:** #5 — Sales Pipeline  
**Scope:** HVCG new business only — legacy clients are migration track, not opportunities  
**CRM lists:** `HVCG_Leads` · `HVCG_Opportunities` · `HVCG_Proposals`  
**Lead scoring:** `SALES_PIPELINE_STATUS.md` (canonical points)

---

## Funnel overview

```
Lead → Qualified → Assessment Complete → Strategy Call → Proposal (owner-priced) → Won | Lost
         │              │                      │                │
         └──────────────┴──────────────────────┴────────────────┘
                    Opportunity stages (CRM) map below
```

**Forbidden:** Treating `HVS_LEGACY_CLIENT` / migration work as sales opportunities.

---

## Stage definitions & exit criteria

### Stage 1 — Lead

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Leads` |
| `LeadStatus` | `New` |
| Entry | Website form, referral, manual entry, EVA complete |
| Classification | `HVCG_PROSPECT` |

**Exit criteria → Qualified**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | Valid contact (name + email) | Y |
| 2 | Company / legal name captured | Y |
| 3 | Not on legacy roster (`LEGACY_HVS_CLIENT_REGISTER`) | Y |
| 4 | Consent attestation (EVA Q0.9) if from assessment | Y |
| 5 | Lead score computed | Y |
| 6 | No auto-disqualify flags (EVA spec) | Y |

**Exit criteria → Disqualified**

- Restricted industry (owner list) · refused attestation · hostile pattern · duplicate legacy client.

---

### Stage 2 — Qualified

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Leads` |
| `LeadStatus` | `Qualified` |
| Automation | `HVCG_LeadQualifiedCreateOpportunity` (idempotent) |
| Opportunity `Stage` | `Discovery` |

**Exit criteria → Assessment Complete**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | Opportunity created and linked (`ConvertedOpportunityId`) | Y |
| 2 | `ServiceInterest` populated | Y |
| 3 | EVA-FREE or FRA started or waived with owner note | Y |
| 4 | Lead score ≥ 40 (Nurture floor) or owner override | Y |

---

### Stage 3 — Assessment Complete

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Opportunities` |
| `Stage` | `Assessment` |
| Inputs | EVA composite score, band, confidence, flags |

**Exit criteria → Strategy Call**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | EVA / FRA completed (`EVA band` stored on Lead notes or additive field) | Y |
| 2 | Preliminary report generated (internal/staging) | Y |
| 3 | Document gap list identified | Y |
| 4 | Lead score ≥ 40; ≥ 70 → Sales Priority | Y |
| 5 | Pricing engine run — `legacy_guard: PASS` | Y |
| 6 | `DiscoveryCallDate` scheduled or completed | Soft |

---

### Stage 4 — Strategy Call

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Opportunities` |
| `Stage` | `Discovery` or `Assessment` *(retain until proposal)* |
| Artifact | `HVCG_DiscoveryCalls` row |

**Exit criteria → Proposal**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | Strategy / discovery call completed | Y |
| 2 | Decision-maker identified (`IsDecisionMaker` on contact or notes) | Y |
| 3 | Capital need + timeline confirmed (EVA §12) | Y |
| 4 | Service path + SKU recommendation documented | Y |
| 5 | Owner aware if Band C or below | Soft |

---

### Stage 5 — Proposal (owner-priced)

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Opportunities` |
| `Stage` | `Proposal` |
| Artifact | `HVCG_Proposals` via `sales/PROPOSAL_TEMPLATE.md` |
| Pricing | Rate card v1 — **`owner_approval_required: true`** |

**Exit criteria → Negotiation**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | Draft proposal generated with `rate_card_version` | Y |
| 2 | **Owner approved price** (`price_status: APPROVED`) | **Y** |
| 3 | Proposal delivered to prospect (manual until BL-C1) | Y |
| 4 | `ProposalAmount`, `MRRImpact`, `SetupFeeImpact` set on Opportunity | Y |

**Exit criteria → Lost (from Proposal)**

- Price objection · timing · competitor · fit · no response — set `LostReason`.

---

### Stage 6 — Negotiation

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Opportunities` |
| `Stage` | `Negotiation` |

**Exit criteria → Won**

| # | Criterion | Required |
|---|-----------|----------|
| 1 | Signed MSA + SOW (path recorded; hash in TermsSourceHash) | Y |
| 2 | Classification → `HVCG_NEW_CLIENT` on conversion | Y |
| 3 | Final price matches owner-approved proposal or documented exception | Y |
| 4 | ContractingEntity = High Value Capital Group LLC | Y |

**Exit criteria → Lost**

- Same as Proposal; set `WinLossStatus: Lost`, `LostDate`.

---

### Stage 7 — Won

| Attribute | Value |
|-----------|-------|
| CRM list | `HVCG_Opportunities` |
| `Stage` | `Won` |
| `WinLossStatus` | `Won` |
| Automation | `HVCG_OpportunityWonCloseout` → onboarding spec |

**Post-Won actions (automated when enabled — Dev only)**

1. Stamp `WonDate`.  
2. Convert Lead → `Converted` + Client record.  
3. Trigger `onboarding/AUTOMATED_ONBOARDING_SPEC.md`.  
4. Capital Raise / Hybrid → `HVCG_CapitalOpportunities` handoff.  
5. **No** portal invite without BL-C1.

---

### Stage 8 — Lost

| Attribute | Value |
|-----------|-------|
| `Stage` | `Lost` |
| `WinLossStatus` | `Lost` |
| Required | `LostReason` |

Win/loss stub → `HVCG_WinLossAnalyses` (existing flow).

---

## CRM stage mapping

| Business stage | `HVCG_Leads.LeadStatus` | `HVCG_Opportunities.Stage` |
|----------------|-------------------------|----------------------------|
| Lead | New | — |
| Qualified | Qualified | Discovery |
| Assessment Complete | Qualified | Assessment |
| Strategy Call | Qualified | Discovery / Assessment |
| Proposal | Qualified / Converted | Proposal |
| Negotiation | Converted | Negotiation |
| Won | Converted | Won |
| Lost | Disqualified or Converted | Lost |

---

## Lead scoring (v1 — from SALES_PIPELINE_STATUS)

| Signal | Points | Detection |
|--------|--------|-----------|
| EVA / FRA completed | +30 | Assessment record exists |
| Revenue band disclosed | +15 | EVA Q2.1 |
| Capital need + timeline | +20 | EVA Q12.1 + Q12.4 |
| Financials available | +15 | EVA Q17.1–Q17.3 any Y |
| Decision-maker booked call | +20 | `DiscoveryCallDate` set |
| Band A readiness (EVA ≥ 80) | +10 | `eva_band = A` |
| Incomplete / low trust flags | −20 | EVA flags / low confidence |

**Thresholds**

| Score | Route |
|-------|-------|
| ≥ 70 | Sales Priority — fast-track strategy call |
| 40–69 | Nurture — content + assessment follow-up |
| &lt; 40 | Educate / FRA only — no proposal without owner override |

Store on `HVCG_Leads.LeadScore`; refresh on EVA update or stage change.

---

## Probability & forecast (guidance)

| `Stage` | Default `Probability` | `ForecastCategory` |
|---------|----------------------|-------------------|
| Discovery | 10% | Pipeline |
| Assessment | 25% | Pipeline |
| Proposal | 50% | Pipeline |
| Negotiation | 75% | Best Case |
| Won | 100% | Closed |
| Lost | 0% | Closed |

---

## Gates & forbidden actions

| Gate | Blocks |
|------|--------|
| BL-C1 | External email, nurture sequences, portal invite |
| BL-W1 | Live website form → Lead create |
| BL-P1 | *(CLOSED)* — rates available |
| Legacy guard | Any HVCG rate card on legacy class |
| PROD-1 | Prod CRM / flows |

---

## Build readiness

| Component | Status |
|-----------|--------|
| Stage definitions | **READY** |
| Lead scoring rules | **READY** |
| CRM column coverage | **PARTIAL** — EVA fields mostly in Notes until additive columns |
| Live automation | **BLOCKED** — BL-W1 (forms), BL-C1 (outbound), D-002 (Maker) |

**Related:** `SALES_PIPELINE_STATUS.md` · `funnel/EVA_INTAKE_TO_CRM_MAP.md` · `sales/PROPOSAL_TEMPLATE.md`
