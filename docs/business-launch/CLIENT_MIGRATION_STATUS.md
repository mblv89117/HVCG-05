# CLIENT_MIGRATION_STATUS

**As of:** 2026-07-15 19:20 PT  

| Metric | Value |
|--------|--------|
| Overall migration % (structured records) | **~72%** |
| Client profile packs | **73** profiles at `clients/<CODE>/PROFILE.md` — see `clients/INDEX.md` |
| Named roster | 7 P1 + 10 Hub DISC + 56 archive/discovery DISC |
| Completed (CRM-ready shells) | 0 (Dev import intentionally blocked) |
| In progress | ACCG pricing verify; P1 shells enriched in profiles |
| Blocked | Graph/PnP contact extract; PDF OCR for signed agreements; owner active/entity confirmations |
| Source coverage | `clients/SOURCE_COVERAGE.md` — Outlook/Teams/SP online **BLOCKED_CREDENTIALS** |
| Prod | Untouched |

## Status by client

| Client | Status | Pricing note | Next |
|--------|--------|--------------|------|
| ACCG Inc. | **IN PROGRESS** | Competing figures: ~$4,562 ops / MSA draft $12,500 / HVCG draft $6,000+$3k setup | Owner BL-ACCG-PRICE + CLASS; Dev import gate |
| Prodigy Games LLC | **SHELL** | Signed CFO path **$7,500/mo** — verify | Contacts via Graph when credentialed |
| That’s Kava LLC | **SHELL** | Bookkeeping **$1,000/mo** (Prodigy+Kava); HVS CFO via PROD01 | Owner verify live instruments |
| Christie’s Place LLC | **SHELL** | Invoice PDFs 2026-06-19 — amount OCR pending | Extract invoice totals |
| Hart Family Dental | **SHELL (WEAK)** | No fee instrument; marketing access checklist only | Owner: active? HVS vs HVCG? |
| Outstanding Auto Detailing LLC | **SHELL (WEAK)** | No HVS contract; member loan 8% GR / $50k cap | Owner: confirm HVS relationship |
| Arboretum LLC | **SHELL** | **$7,500** deposit + **1%** quarterly GR + **5%** equity | Owner: active vs former |
| Pierlo Inc | **DISCOVERY** | None — lender soft quotes | Classify |
| Integrity Lift Solutions LLC | **DISCOVERY** | **$10,000** retainer candidate | Verify signed PDF |
| Lien Partners LLC | **DISCOVERY** | **$4,562/mo** sprint | Confirm sprint vs ongoing |
| LV Appraisals | **DISCOVERY** | Missing | Confirm client vs prospect |
| Colorado Beef | **DISCOVERY** | Missing | Classify intro |
| Frocovery LLC | **DISCOVERY+** | **$2,500** setup + tiered monthly | Confirm live tier |
| Victory Contracting LLC | **DISCOVERY** | **$10,000** + **5%** equity | Verify signed + equity review |

## P1 onboarding checklist (2026-07-15 batch)

| Client | Packet | CRM Dev JSON | Pricing extract |
|--------|--------|--------------|-----------------|
| That’s Kava LLC | ✅ | ✅ KAVA01 | ✅ DOCX $1,000/mo |
| Hart Family Dental | ✅ | ✅ HART01 | ⚠️ MISSING |
| Outstanding Auto Detailing LLC | ✅ | ✅ OAD01 | ⚠️ No HVS instrument |
| Arboretum LLC | ✅ | ✅ ARBO01 | ✅ DOCX deposit + GR + equity |

## Client profile packs (2026-07-15)

| Artifact | Path | Count |
|----------|------|-------|
| Profile index | `clients/INDEX.md` | 73 unique codes |
| Source coverage | `clients/SOURCE_COVERAGE.md` | 6 blocked sources logged |
| P1 enriched | ACCG01, PROD01, CHRI01, ARBO01, KAVA01, HART01, OUTS01 | 7 |
| Hub DISC enriched | DISC_01–DISC_07 | 7 |
| Archive duplicates | `*_ARCH` profiles | 8 |

## Definition of done (per client)

Checklist complete or MISSING with owner ask — no external contact unless approved. Profile pack = `clients/<CODE>/PROFILE.md` with 12 sections.
