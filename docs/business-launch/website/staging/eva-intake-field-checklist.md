# EVA intake field checklist

**Brand:** High Value Capital Group LLC  
**As of:** 2026-07-15  
**Purpose:** Map Enterprise Value Assessment (EVA) form fields → Dev CRM lead list columns  
**Gate:** Form wiring after **BL-W1** (Microsoft Forms → Power Automate → `HVCG_Leads`)

---

## Form → CRM mapping

| # | EVA form field | Type | Required | CRM target (Dev) | Notes |
|---|----------------|------|----------|------------------|-------|
| 1 | First name | Text | Yes | `LeadFirstName` | |
| 2 | Last name | Text | Yes | `LeadLastName` | |
| 3 | Email | Email | Yes | `LeadEmail` | Primary contact |
| 4 | Phone | Phone | No | `LeadPhone` | Optional |
| 5 | Company name | Text | Yes | `CompanyName` | |
| 6 | Role / title | Text | Yes | `LeadTitle` | Owner, CFO, etc. |
| 7 | Decision-maker? | Yes/No | Yes | `IsDecisionMaker` | Boolean |
| 8 | Revenue band | Choice | Yes | `RevenueBand` | e.g. &lt;$1M · $1–5M · $5–15M · $15M+ |
| 9 | Capital intent | Choice | Yes | `CapitalIntent` | Debt · Equity · Refinance · Growth · Unsure |
| 10 | Capital timeline | Choice | Yes | `CapitalTimeline` | 0–3mo · 3–6mo · 6–12mo · 12mo+ |
| 11 | Books quality (self-rated) | Choice | Yes | `BooksQualitySelf` | Poor · Fair · Good · Strong |
| 12 | Value-driver themes | Multi-select | Yes | `ValueDriverThemes` | Store as delimited or related list |
| 13 | Top challenge (short text) | Text (500) | Yes | `OpenChallenge` | Free text |
| 14 | Assessment type | Hidden | Yes | `AssessmentType` | Constant: `EVA` |
| 15 | Source page | Hidden | Yes | `LeadSource` | Constant: `Website-EVA` |
| 16 | Submission timestamp | Auto | Yes | `EVASubmittedOn` | Automate sets UTC |

### Value-driver theme options (multi-select)

- Revenue quality and concentration
- Margin and unit economics
- Working capital / cash conversion
- Debt structure and covenants
- Management depth and key-person risk
- Market position and differentiation
- Documentation and reporting maturity
- Legal / entity structure clarity

---

## Post-submit automation (BL-W1)

| Step | Action |
|------|--------|
| 1 | Form submit → Power Automate trigger |
| 2 | Upsert `HVCG_Leads` by email (create or update) |
| 3 | Set `LeadStage` = `EVA_COMPLETE` |
| 4 | Set `RecommendedNextStep` = `CAPITAL_READINESS` |
| 5 | No auto-email to prospect until owner approves thank-you copy |

---

## Disclosures (form footer)

- Link to `/disclaimer.html`
- Text: *Not a valuation, financing decision, or appraisal.*
- Text: *Final engagement pricing requires owner approval.*

---

## Related assessments

Capital Readiness fields are documented separately in `CONTENT_PLAN.md` § Assessment question banks. CRM update uses same lead record with `AssessmentType` = `CAPITAL_READINESS`.
