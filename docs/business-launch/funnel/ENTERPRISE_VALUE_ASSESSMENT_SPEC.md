# ENTERPRISE_VALUE_ASSESSMENT_SPEC

**As of:** 2026-07-15 18:10 PT  
**Owner track:** Finance + Funnel (Business Launch)  
**Audience:** Productized free/lead-gen EVA and paid deep-dive variants  
**Status:** SPEC READY — not live; no prospect-facing publish  

## Purpose

Capture structured inputs to (1) score capital / advisory readiness, (2) recommend a service path, and (3) feed the **new HVCG client** pricing engine. Outputs are **preliminary** and **non-binding**.

## Hard rules

1. Applies to `HVCG_PROSPECT` / `HVCG_NEW_CLIENT` only.  
2. Never use EVA outputs to reprice or re-contract `HVS_LEGACY_CLIENT` / `HVS_TRANSITIONING_CLIENT` without explicit owner approval.  
3. No guarantees of valuation, financing, approval, funding amount/timing, tax outcome, legal outcome, or business performance.  
4. If material inputs are later found inaccurate → surface inaccurate-info notice before any price or recommendation adjustment (see Pricing Engine).  
5. No automated outbound (email/SMS) without owner BL-C1.

## Funnel placement

Traffic → **Free EVA** → Capital Readiness (future) → Preliminary report → Qualification score → Service path → Pricing range → Strategy call → Proposal → Agreement → Payment → Onboarding

## Variants

| Variant | Depth | Use |
|---------|-------|-----|
| EVA-FREE | Core bank (Q sections 0–16 abbreviated where marked) | Lead gen / website |
| EVA-PAID | Full bank + document upload checklist | Paid deep-dive |
| EVA-INTERNAL | Full bank + analyst overrides | Staff-only enrichment |

---

## Question bank

**Scoring legend (default):** each scored item 0–5 unless noted. Higher = stronger / lower risk / higher readiness (invert where marked ↓).  
**Confidence:** every section has `confidence` 1–5 (self-reported data quality). Missing required items → section confidence capped at 2.

### 0 — Identity & consent

| ID | Question | Type | Required | Scored? |
|----|----------|------|----------|---------|
| Q0.1 | Legal business name | text | Y | N |
| Q0.2 | DBA (if any) | text | N | N |
| Q0.3 | Entity type (LLC, Corp, Sole Prop, Partnership, Nonprofit, Other) | enum | Y | N |
| Q0.4 | State of formation | text | Y | N |
| Q0.5 | Years in operation | number | Y | Y (maturity) |
| Q0.6 | Primary contact name / role / email / phone | text | Y | N |
| Q0.7 | Website / LinkedIn | url | N | N |
| Q0.8 | Classification intent (HVCG Prospect) | confirm | Y | N |
| Q0.9 | Consent: data used for assessment & internal CRM only; not a financing application | confirm | Y | N |
| Q0.10 | Attestation: answers are accurate to the best of my knowledge | confirm | Y | N |

### 1 — Business maturity

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q1.1 | Stage (idea, pre-revenue, early, growth, mature, turnaround) | enum | idea=0 … mature=5; turnaround=2 |
| Q1.2 | Years profitable (GAAP or tax) | number | 0=0; 1=2; 2–3=3; 4–7=4; 8+=5 |
| Q1.3 | Formal operating plan / budget exists? | Y/N/partial | N=0; partial=2; Y=5 |
| Q1.4 | Documented processes / SOPs for core ops? | scale 1–5 | as-is |
| Q1.5 | Key-person dependency (owner does most critical work)? | scale 1–5 ↓ | invert |
| Q1.6 | Successor / continuity plan? | Y/N/partial | N=0; partial=2; Y=5 |

**Section score:** mean of scored items → `maturity_score` (0–5).

### 2 — Revenue

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q2.1 | Trailing-12-month (TTM) revenue | currency band | <$100k=1; $100–500k=2; $500k–1.5M=3; $1.5–5M=4; $5M+=5 |
| Q2.2 | Prior-year revenue | currency band | trend vs Q2.1 |
| Q2.3 | Revenue trend (declining / flat / modest growth / strong growth) | enum | declining=1 … strong=5 |
| Q2.4 | Recurring / contracted % of revenue | % | 0–20=1 … 80+=5 |
| Q2.5 | # of paying customers (approx) | number | context only |
| Q2.6 | Average sale / ACV | currency | context |
| Q2.7 | Seasonality severity | scale 1–5 ↓ | invert |

**Section score:** `revenue_score` (0–5).

### 3 — Profitability

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q3.1 | TTM gross margin % | % | <20=1; 20–35=2; 35–50=3; 50–65=4; 65+=5 |
| Q3.2 | TTM EBITDA / operating profit (approx) | currency / band | loss=0–1; breakeven=2; modest=3; strong=4–5 |
| Q3.3 | Owner add-backs / discretionary expenses material? | Y/N/unk | Y lowers confidence; adjust analyst note |
| Q3.4 | Path to profitability (if loss-making) | text | required if loss |
| Q3.5 | Pricing power vs peers (self-assess) | scale 1–5 | as-is |

**Section score:** `profitability_score` (0–5).

### 4 — Cash flow

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q4.1 | Typical cash runway (months) | number | <1=0; 1–2=1; 3–5=2; 6–11=3; 12–18=4; 18+=5 |
| Q4.2 | Cash conversion cycle stress | scale 1–5 ↓ | invert |
| Q4.3 | AR aging healthy? (>90 days material?) | Y/N/partial | |
| Q4.4 | AP / vendor pressure | scale 1–5 ↓ | invert |
| Q4.5 | Personal funds regularly used for ops? | Y/N ↓ | Y=1; N=5 |
| Q4.6 | Weekly / monthly cash forecast used? | Y/N/partial | |

**Section score:** `cash_score` (0–5).

### 5 — Debt

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q5.1 | Total business debt outstanding | currency band | context + leverage vs revenue |
| Q5.2 | Debt types (bank, SBA, MCA, credit cards, related-party, other) | multi | MCA/stacking ↓ score |
| Q5.3 | Monthly debt service | currency | DSCR proxy |
| Q5.4 | Current on all obligations? | Y/N/partial | N=0; partial=2; Y=5 |
| Q5.5 | Personal guarantees? | Y/N | flag only |
| Q5.6 | Defaults / collections / UCC issues (24 mo)? | Y/N | Y=0 section cap unless explained |

**Section score:** `debt_score` (0–5), capped if Q5.6=Y.

### 6 — Assets

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q6.1 | Material hard assets (equipment, RE, inventory, vehicles)? | Y/N + list | |
| Q6.2 | Estimated FMV of pledgeable assets | currency band | |
| Q6.3 | IP / contracts / licenses of value? | Y/N + text | soft collateral flag |
| Q6.4 | Asset liens / UCC filings known? | Y/N/unk | |

**Section score:** `assets_score` (0–5) — primarily collateral readiness.

### 7 — Ownership

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q7.1 | Ownership % breakdown (owners ≥10%) | structure | clean=5; complex/disputed ↓ |
| Q7.2 | Any outside investors / preferred rights? | Y/N | flag |
| Q7.3 | Related-party transactions material? | Y/N | ↓ confidence |
| Q7.4 | Spousal / community-property considerations? | Y/N/unk | flag |
| Q7.5 | Buy-sell / operating agreement in place? | Y/N/partial | |

**Section score:** `ownership_score` (0–5).

### 8 — Industry

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q8.1 | Primary NAICS / industry description | text/enum | |
| Q8.2 | Regulated industry? (fintech, healthcare, cannabis, gambling, etc.) | Y/N | may gate capital products |
| Q8.3 | Industry growth outlook (self + known) | scale 1–5 | |
| Q8.4 | Competitive intensity | scale 1–5 ↓ | invert |
| Q8.5 | Cyclicality / commodity exposure | scale 1–5 ↓ | invert |

**Section score:** `industry_score` (0–5). Hard **disqualify flags** for owner-defined restricted industries (config; TBD owner).

### 9 — Growth

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q9.1 | 12-month growth target (%) | number | ambition vs realism check |
| Q9.2 | Primary growth lever (sales, product, geo, M&A, other) | enum | |
| Q9.3 | Pipeline / backlog visibility | scale 1–5 | |
| Q9.4 | Capacity constraints (people, capital, ops) | multi | feeds capital purpose |
| Q9.5 | Prior capital raises / use of funds success? | Y/N/NA | |

**Section score:** `growth_score` (0–5).

### 10 — Operating risk

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q10.1 | Customer concentration (top customer %) | % ↓ | >40% ↓↓ |
| Q10.2 | Supplier concentration | scale 1–5 ↓ | |
| Q10.3 | Litigation / regulatory actions pending? | Y/N | Y = flag + score cap |
| Q10.4 | Insurance adequacy (GL, E&O, cyber, key-man) | scale 1–5 | |
| Q10.5 | Fraud / control incidents (36 mo)? | Y/N | |
| Q10.6 | Cyber / data-security posture | scale 1–5 | |

**Section score:** `operating_risk_score` (0–5) — higher = lower risk after invert where marked.

### 11 — Reporting quality

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q11.1 | Books system (QB, Xero, Wave, spreadsheet, none) | enum | none/spreadsheet ↓ |
| Q11.2 | Close cadence (never / annual / quarterly / monthly / continuous) | enum | |
| Q11.3 | Accrual vs cash | enum | |
| Q11.4 | Last CPA review / audit / compile | enum + year | |
| Q11.5 | Bank / P&L reconciling? | Y/N/partial | |
| Q11.6 | Management dashboard exists? | Y/N/partial | |
| Q11.7 | Tax filings current? | Y/N/unk | N = severe flag |

**Section score:** `reporting_score` (0–5). Strong input to Fractional CFO vs Capital Advisory routing.

### 12 — Capital need / purpose / timeline

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q12.1 | Capital sought (amount band) | currency band | |
| Q12.2 | Purpose (growth, working capital, refinance, acquisition, equipment, turnaround, other) | multi | |
| Q12.3 | Preferred instrument (debt, equity, hybrid, unsure) | enum | |
| Q12.4 | Timeline need (urgent <30d / 30–90 / 90–180 / exploratory) | enum | urgency ≠ readiness |
| Q12.5 | Prior declines / broker shopping? | Y/N + text | |
| Q12.6 | Use-of-funds plan documented? | Y/N/partial | |

**Section score:** `capital_need_clarity_score` (0–5). Amount itself is not “good/bad”; clarity and fit are scored.

### 13 — Collateral

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q13.1 | Willing to pledge business assets? | Y/N/unk | |
| Q13.2 | Willing to provide personal guarantee? | Y/N/unk | |
| Q13.3 | RE equity available? | Y/N/unk + band | |
| Q13.4 | AR / inventory financing eligible (self-view)? | Y/N/unk | |
| Q13.5 | Existing blanket liens? | Y/N/unk | |

**Section score:** `collateral_score` (0–5).

### 14 — Management

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q14.1 | Years owner experience in this industry | number | |
| Q14.2 | Prior exits / scaled businesses? | Y/N | |
| Q14.3 | Finance lead on team (owner / bookkeeper / controller / CFO)? | enum | |
| Q14.4 | Willingness to engage advisors & share data | scale 1–5 | |
| Q14.5 | Decision speed / authority clarity | scale 1–5 | |

**Section score:** `management_score` (0–5).

### 15 — Concentration (commercial)

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q15.1 | Top 3 customers % of revenue | % ↓ | |
| Q15.2 | Top 3 products/services % | % ↓ | |
| Q15.3 | Geographic concentration | scale 1–5 ↓ | |
| Q15.4 | Channel concentration (e.g. one marketplace) | scale 1–5 ↓ | |

**Section score:** `concentration_score` (0–5). May merge with Q10.1 in free variant.

### 16 — Exit

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q16.1 | Exit horizon (none / <2y / 2–5 / 5–10 / evergreen) | enum | |
| Q16.2 | Exit type interest (sale, succession, PE, IPO, lifestyle) | multi | |
| Q16.3 | Valuation expectation (band / unknown) | text | flag if unrealistic vs comps |
| Q16.4 | Cleanliness for diligence (contracts, IP assignment, books) | scale 1–5 | |

**Section score:** `exit_score` (0–5) — optional weight for advisory packaging.

### 17 — Operational readiness

| ID | Question | Type | Scoring notes |
|----|----------|------|---------------|
| Q17.1 | Can provide last 2 years tax returns? | Y/N | |
| Q17.2 | Can provide YTD + prior P&L / BS / cash flow? | Y/N | |
| Q17.3 | Bank statements (6–12 mo) available? | Y/N | |
| Q17.4 | Debt schedule available? | Y/N | |
| Q17.5 | Org chart / ownership docs available? | Y/N | |
| Q17.6 | Response SLA commitment for diligence requests | enum | |
| Q17.7 | Preferred engagement start window | enum | |

**Section score:** `ops_readiness_score` (0–5). Gate for paid engagement kickoff.

---

## Composite scoring

### Weights (v1 draft — tunable; owner may revise)

| Domain | Weight |
|--------|--------|
| Maturity | 8% |
| Revenue | 10% |
| Profitability | 10% |
| Cash flow | 10% |
| Debt | 8% |
| Assets / collateral | 7% |
| Ownership | 5% |
| Industry | 5% |
| Growth | 7% |
| Operating risk | 8% |
| Reporting quality | 8% |
| Capital need clarity | 5% |
| Management | 5% |
| Concentration | 2% |
| Exit | 1% |
| Operational readiness | 1% |

`composite_raw` = Σ (section_score × weight) → normalize to **0–100**.

### Bands

| Band | Score | Meaning |
|------|-------|---------|
| A | 80–100 | Strong readiness — priority strategy call |
| B | 65–79 | Good fit — standard path |
| C | 50–64 | Conditional — strengthen reporting / clarity first |
| D | 35–49 | Weak — education / Fractional CFO first |
| F | <35 | Disqualify or nurture-only (owner rules) |

### Qualification / disqualification (v1)

**Auto-disqualify candidates (config flags; owner confirms list):** restricted industry, active fraud, refusal of attestation, incomplete identity, hostile / non-responsive pattern.  

**Soft hold:** tax filings not current; books = none; MCA stacking + urgent capital; litigation material without disclosure package.

### Service-path recommendation (rules sketch)

| Condition | Suggested path |
|-----------|----------------|
| Reporting ≤2 and capital urgency high | Fractional CFO / books remediation before capital |
| Capital clarity ≥3, debt OK, collateral ≥3, band A–B | Capital Advisory + Capital Readiness |
| Growth + exit focus, reporting ≥3 | Advisory retainer + EVA-PAID |
| Band D–F | Nurture content / free report only |

Pricing ranges for recommended SKUs: see `PRICING_ENGINE_SPEC.md` (rates **TBD OWNER BL-P1**).

### Confidence index

`confidence_index` = mean of section confidences × completeness_ratio.  
Emit with every score: `score`, `band`, `confidence_index`, `flags[]`.

---

## Outputs (preliminary report)

1. Composite score + band + confidence  
2. Domain radar / top 3 strengths / top 3 gaps  
3. Suggested service path (non-binding)  
4. Document request list for next step  
5. **Disclaimer block** (required on every artifact)

---

## Disclaimers (must appear on all EVA artifacts)

> This Enterprise Value Assessment is a **preliminary informational tool** only. It is **not** a formal valuation, appraisal, fairness opinion, financing offer, credit decision, investment advice, tax advice, or legal advice. HVCG does **not** guarantee any valuation range, financing approval, funding amount or timing, lender/investor outcome, tax result, legal result, or business performance. Scores and recommendations are based on **self-reported** information and may change after verification. Providing inaccurate or incomplete information may result in revised recommendations and pricing; you will be notified before material adjustments where practicable. Past client results (if any) are not indicative of future results. Engagement terms are governed solely by a signed HVCG agreement.

---

## Implementation notes

- Persist answers to CRM/prospect record fields (Dev only until approved).  
- Do not connect bank/payment processors from EVA.  
- Free variant may omit detailed currency amounts in favor of bands.  
- Capital Readiness Assessment is a **separate** subsequent instrument (NOT STARTED).  
- Owner decision **BL-P1** required before any dollar pricing attached to recommendations.

## Related docs

- `../FUNNEL_STATUS.md`  
- `PRICING_ENGINE_SPEC.md`  
- `../PRICING_REGISTER.md`  
- `../OWNER_DECISIONS.md` (BL-P1, BL-C1)
