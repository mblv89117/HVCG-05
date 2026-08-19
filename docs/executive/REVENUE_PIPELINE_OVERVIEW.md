# Revenue Pipeline Overview — Executive Summary

**Generated:** 2026-07-16 01:17 UTC  
**Source (read-only):** `CLIENT_HEALTH_DASHBOARD.json` + `clients/*/PROFILE.md`  
**Mode:** READ-ONLY intelligence — no Prod writes, no register edits

---

## North-star revenue posture

| Domain | Value | Confidence | Notes |
|--------|------:|:----------:|-------|
| **New-business pipeline $** | **$0** | — | No public CRM funnel; Opportunities/Leads not populated for launch |
| **Weighted forecast** | **$0** | — | No `HVCG_RevenueForecastLines` seed for legacy book |
| **Verified MRR floor** | **$9,289/mo** | Invoice-backed | ACCG01 + CHRI01 only |
| **Directional MRR (structured, unverified)** | **$17,851–$20,351/mo** | Low | See table below — excludes equity/GR/success fees |
| **Capital / success-fee upside** | **Unmodeled** | — | ARBO01 GR, VICT01 equity, PROD01 success fees not in MRR |

> Zeros are **expected and correct** where no public funnel exists. Do not backfill pipeline or forecast from discovery packets.

---

## Invoice-verified MRR (directional floor)

Only two structured clients have invoice- or bill-verified recurring signals:

| Code | Client | Verified MRR | Evidence | Health band |
|------|--------|-------------:|----------|:-----------:|
| `ACCG01` | ACCG Inc. | **$4,539/mo** | INV-2026-05-ACCG-AP (`HVS_Invoice_ACCG_2026-5.pdf`) | Green |
| `CHRI01` | Christie's Place LLC | **$4,750/mo** | Square invoices #0000128 / #0000129 (due 2026-06-19) | Yellow |

**Verified floor total: $9,289/mo** ($111,468/yr run-rate if both remain active).

> **CHRI01 caveat:** Dual $4,750 invoices may represent one month or two engagements — owner must confirm cadence before CRM import.

---

## Directional MRR — structured but unverified

| Code | Client | Stated MRR | Band | Blocker |
|------|--------|----------:|:----:|---------|
| `PROD01` | Prodigy Games LLC | $7,500/mo | Green | Signed PDF not verified |
| `LIEN01` | Lien Partners LLC | $4,562/mo | Yellow | Sprint vs ongoing unclear |
| `KAVA01` | That's Kava LLC | $1,000/mo | Yellow | Zero doc corpus; co-located with Prodigy |
| `FROC01` | Frocovery LLC | $500–$2,500/mo | Green | Live tier UNVERIFIED |
| `INTL01` | Integrity Lift Solutions | $10,000 setup* | Yellow | Setup/retainer — not normalized to MRR |
| `ARBO01` | Arboretum LLC | $7,500 setup* | Yellow | Deposit + 1% GR + 5% equity — not MRR |
| `VICT01` | Victory Contracting | $10,000 setup* | Yellow | Setup + 5% equity — not MRR |

\*Setup/retainer instruments — excluded from recurring run-rate until normalized.

**If PROD01 + LIEN01 + KAVA01 + FROC01 (mid-tier $1,500) are all active:**  
$7,500 + $4,562 + $1,000 + $1,500 = **$14,562/mo** unverified additive.

**Combined verified + best-case structured unverified:**  
$9,289 + $14,562 = **$23,851/mo** directional ceiling (not forecast).

---

## Pipeline funnel (public CRM)

| Stage | Count | $ | Status |
|-------|------:|--:|--------|
| Leads | 0 | $0 | No seed |
| Opportunities (open) | 0 | $0 | No seed |
| Proposals (sent) | 0 | $0 | No seed |
| Win rate (90d) | — | — | Insufficient closed data |

**Executive read:** Revenue visibility today is **retainer archaeology**, not pipeline selling. KPI-01 (Pipeline $) and KPI-04 (Weighted forecast) will read **zero** on Dev until CRM import of verified clients completes.

---

## Cash and AR (inferred from profiles)

| Signal | Status |
|--------|--------|
| Retainer invoices in packet | ACCG01 (May 2026), CHRI01 (Jun 2026 due) |
| Past-due modeling | **Not available** — no `HVCG_Invoices` import |
| Cash collected MTD/YTD | **$0** in CRM — use finance ops post-import |
| Revenue at risk | **Unmodeled** — 60/61 clients lack renewal dates |

---

## Concentration

| Tier | Clients | Share of verified MRR |
|------|--------:|----------------------:|
| Top 1 (CHRI01) | 1 | 51% ($4,750) |
| Top 2 (CHRI01 + ACCG01) | 2 | 100% ($9,289) |

Verified book is **two-client concentrated**. PROD01 at $7,500/mo would flip concentration if signed agreement verified.

---

## Cross-sell and expansion (identified)

Structured clients with cross-sell flag **Identified** (6 total across portfolio):

| Code | Current engagement | Upside vector |
|------|-------------------|---------------|
| `PROD01` | Fractional CFO | Capital advisory, affiliated entities |
| `ACCG01` | Fractional CFO / Capital | HVCG transition SOW (draft — not applied) |
| `FROC01` | BDA / capital access | Tier upgrade within BDA |
| `LIEN01` | Close-readiness sprint | Ongoing advisory retainer |
| `KAVA01` | Bookkeeping | Bundled with Prodigy CFO stack |
| `ARBO01` | Capitalization advisory | Equity/GR realization |

No cross-sell pipeline $ is modeled — flags are qualitative only.

---

## Renewal calendar

| Status | Count | Revenue impact |
|--------|------:|----------------|
| **MISSING** | 60 | Cannot forecast churn or expansion |
| **KNOWN** | 1 (`FROC01`) | Only structured renewal on file |

---

## Recommended executive framing (Dev dashboard)

| Tile | Dev display | Source until CRM import |
|------|-------------|-------------------------|
| Pipeline $ | **$0** or `—` | `HVCG_Opportunities` empty |
| MRR | **$9,289** (verified) + tooltip for directional | Health register pricing_confidence |
| Forecast | **$0** | No forecast lines |
| AR past due | **$0** or `—` | No invoice import |
| Capital pipeline | **$0** | No capital opps seed |

---

## Data lineage

| Register | Owner | ECC access |
|----------|-------|------------|
| `CLIENT_HEALTH_DASHBOARD.json` | master-pm-orchestrator | READ-ONLY |
| `clients/*/PROFILE.md` | master-pm-orchestrator | READ-ONLY |
| SharePoint `HVCG_*` lists | CRM / Finance agents | Dev import pending |

No amounts in this document should be written to Prod or master-pm registers without owner verification.
