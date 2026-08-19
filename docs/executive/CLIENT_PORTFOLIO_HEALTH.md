# Client Portfolio Health — Executive One-Pager

**Generated:** 2026-07-16 01:17 UTC  
**Source (read-only):** `master-pm-orchestrator/docs/business-launch/executive/CLIENT_HEALTH_DASHBOARD.json`  
**Rubric:** `executive/CLIENT_HEALTH_RUBRIC.md`  
**Mode:** READ-ONLY intelligence — no Prod writes, no register edits

---

## Portfolio snapshot

| Metric | Value |
|--------|------:|
| Clients scored | **63** |
| Structured (evidence-backed) | **14** |
| Discovery-only (census) | **49** |
| **Green** | **3** |
| **Yellow** | **6** |
| **Red** | **54** |

> **Band counts mirror source register exactly:** Green **3** · Yellow **6** · Red **54**.

Only **14** clients have structured profiles with engagement, pricing, and risk signals. The remaining **49** are hub-discovery census entries — scored Red by default until classified.

---

## Health distribution

```
Green  ███                    3   (5%)
Yellow ██████                 6   (10%)
Red    ██████████████████████████████████████████████████████  54  (86%)
```

**Executive read:** The portfolio is overwhelmingly **Red** because legacy HVS discovery outpaces verified CRM state. The three **Green** accounts are the only structured clients with strong document + engagement signals; six **Yellow** accounts need owner confirmation before they can move Green.

---

## Green — protect and verify (3)

| Code | Client | Score | MRR signal | Top action |
|------|--------|------:|------------|------------|
| `PROD01` | Prodigy Games LLC | 75 | $7,500/mo (UNVERIFIED signed) | Verify signed CFO agreement; add primary contacts |
| `ACCG01` | ACCG Inc. | 73 | **$4,539/mo VERIFIED** | Close BL-ACCG-PRICE; confirm drafts inactive; extract renewal |
| `FROC01` | Frocovery LLC | 73 | Tiered $500–$2,500/mo (live tier UNVERIFIED) | Confirm executed BDA date + live revenue tier |

**Concentration risk:** Two of three Greens are legacy HVS fractional CFO / capital relationships. Frocovery is the only Green with renewal **KNOWN** — all others in structured tier show renewal **MISSING**.

---

## Yellow — executive attention queue (6)

| Code | Client | Score | Primary risk | Top action |
|------|--------|------:|--------------|------------|
| `LIEN01` | Lien Partners LLC | 60 | Sprint vs ongoing unclear; contacts unknown | Confirm sprint vs ongoing; reconcile EAM fee stack |
| `INTL01` | Integrity Lift Solutions LLC | 53 | Draft client-name mismatch; no comms | OCR signed PDF; resolve draft mismatch |
| `KAVA01` | That's Kava LLC | 52 | Zero document corpus; co-located with Prodigy | Confirm $1,000/mo bookkeeping live vs Prodigy stack |
| `ARBO01` | Arboretum LLC | 47 | Engagement status unknown; equity/GR terms | Owner confirm active vs former; verify equity/GR |
| `CHRI01` | Christie's Place LLC | 47 | **$4,750/mo INVOICE_EXTRACTED**; status unknown | Confirm $4,750 cadence; CRM import |
| `VICT01` | Victory Contracting LLC | 46 | $10k setup + 5% equity UNVERIFIED | Owner review equity terms; verify signed execution |

**Pattern:** Yellow clients have document packets or invoice evidence but lack confirmed active status, signed execution, or renewal windows. **60 of 61** unique clients show renewal **MISSING**.

---

## Red — structured P1 needing classification (5 of 14 structured)

| Code | Client | Score | Gap |
|------|--------|------:|-----|
| `PIER01` | Pierlo Inc (Baker's Travertine) | 30 | No pricing; classify engagement |
| `LVAP01` | LV Appraisals | 24 | Active client vs marketing-only |
| `OAD01` | Outstanding Auto Detailing LLC | 21 | HVS advisory relationship unconfirmed |
| `COBE01` | Colorado Beef | 20 | Intro/prospect vs engagement |
| `HART01` | Hart Family Dental | 19 | No executed SOW; HVS vs HVCG entity |

Named P1 roster (`INDEX.md`) also includes `OUTS01` — scored Red in discovery census (0 files).

---

## Discovery census (49 Red)

Hub discovery (`DISC_01`–`DISC_58`) accounts for the bulk of Red band. These entries have file counts but **MISSING** pricing confidence, engagement classification, and CRM identity. They are inventory — not active portfolio — until owner triage promotes them to structured tier.

Representative high-file discovery (potential future structured):

| Code | Name | Files |
|------|------|------:|
| `DISC_56` | Victorum Tattoo | 334 |
| `DISC_50` | Smith River RV Park | 90 |
| `DISC_11` | 105 Cimmaron | 86 |

---

## Cross-cutting risks

| Signal | Count (unique clients) | Executive implication |
|--------|----------------------:|----------------------|
| Renewal **MISSING** | 60 | No renewal calendar — revenue at risk is unmodeled |
| Pricing **MISSING** | 51 | MRR and LTV cannot be trusted from CRM alone |
| Pricing **UNVERIFIED** | 8 | Directional only — owner sign-off required |
| Pricing **VERIFIED / INVOICE** | 2 | Floor MRR: **$9,289/mo** (ACCG + Christie's Place) |
| Cross-sell **Identified** | 6 | Upside exists on Greens/Yellows only |
| Contacts unknown / blocked | Multiple structured | Blocks outreach and escalation |

---

## Owner decisions (next 14 days)

1. **BL-ACCG-PRICE** — freeze ACCG at $4,539/mo; deactivate conflicting drafts.  
2. **Active vs former** — ARBO01, CHRI01, VICT01, HART01 need binary owner confirm.  
3. **Prodigy stack** — PROD01 + KAVA01: verify signed agreements and live fee stack ($8,500/mo combined if both active).  
4. **Renewal extraction** — prioritize ACCG01 MSA and FROC01 (only KNOWN renewal).  
5. **Discovery triage** — do not promote DISC_* to CRM until engagement classified.

---

## Data lineage

| Layer | Path | Write policy |
|-------|------|--------------|
| Health register | `master-pm-orchestrator/.../CLIENT_HEALTH_DASHBOARD.json` | **READ-ONLY** (master-pm owns) |
| Client profiles | `master-pm-orchestrator/.../clients/{CODE}/PROFILE.md` | **READ-ONLY** |
| Executive surface | `executive-command-center/docs/executive/` (this file) | ECC branch only |
| CRM / Prod | SharePoint `HVCG_Clients` | **FORBIDDEN** from this pass |
