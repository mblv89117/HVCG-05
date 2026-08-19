# LEGACY_HVS_CLIENT_REGISTER

**Entity of record for existing contracts:** High Value Solution LLC (HVS)  
**Rule:** Do not auto-migrate contracts/pricing to HVCG. Mark classification clearly.  
**As of:** 2026-07-15 18:30 PT  

| # | Legal name | Classification | Priority | Status | Engagement pricing status | CRM | Workspace | Inventory | Blockers |
|---|------------|----------------|----------|--------|---------------------------|-----|-----------|-----------|----------|
| 1 | ACCG Inc. | HVS LEGACY (TRANSITIONING candidate) | P0 | **IN PROGRESS** | Multi-source — owner BL-ACCG-PRICE | Shell + Dev JSON | Hub SoR proposed | Deep OD + extracts | Price/class + Graph |
| 2 | Prodigy Games LLC | HVS LEGACY | P1 | **SHELL** | **$7,500/mo** CFO — verify signed | Dev JSON | Hub folder | Agreements located | Contacts + Dev import gate |
| 3 | That’s Kava LLC | HVS LEGACY | P1 | **SHELL** | **$1,000/mo** bookkeeping (co-file Prodigy) | Dev JSON | Under Prodigy contracts | Agreement extracted | Verify live vs Prodigy CFO stack |
| 4 | Christie’s Place LLC | HVS LEGACY | P1 | **SHELL** | Invoice PDFs — OCR pending | Dev JSON | Hub folder | Folder + invoices | Extract invoice amounts |
| 5 | Hart Family Dental | HVS LEGACY | P1 | **SHELL (WEAK)** | **MISSING** — marketing access doc only | Dev JSON | HVCG Clients + archive | Partial | Confirm active + HVS vs HVCG entity |
| 6 | Outstanding Auto Detailing LLC | HVS LEGACY | P1 | **SHELL (WEAK)** | No HVS instrument; OA **$50k loan / 8% GR** (member doc) | Dev JSON | Personal Drive archive | Operating agr. only | Confirm HVS client relationship |
| 7 | Arboretum LLC | HVS LEGACY / FORMER? | P1 | **SHELL** | **$7,500** deposit + **1%** quarterly GR + **5%** equity | Dev JSON | OD Arboretum | Agreement extracted | Confirm active vs former |
| 8 | Pierlo Inc (DBA Baker's Travertine Power Clean) | HVS LEGACY | P2 | **DISCOVERY** | **MISSING** | Dev JSON | Hub | Intake template | Classify engagement |
| 9 | Integrity Lift Solutions LLC | HVS LEGACY | P2 | **DISCOVERY** | **$10,000** retainer (verify signed PDF) | Dev JSON | Hub | Agreement + invoice PDF | Draft DOCX client-name mismatch |
| 10 | Lien Partners LLC | HVS LEGACY | P2 | **DISCOVERY** | **$4,562/mo** sprint SOW extracted | Dev JSON | Hub | SOW + signed PDF | EAM fee stack vs LP record |
| 11 | LV Appraisals | HVS LEGACY | P2 | **DISCOVERY** | **MISSING** | Dev JSON | Hub | Website docs | Confirm active client |
| 12 | Colorado Beef | HVS LEGACY | P2 | **DISCOVERY** | **MISSING** | Dev JSON | Hub (1 file) | Intro PDF | Classify prospect vs client |
| 13 | Frocovery LLC | HVS LEGACY | P2 | **DISCOVERY+** | Setup **$2,500** + tiered **$500–$2,500/mo** | Dev JSON | Hub | BDA executed 2026-03-10 | Confirm live revenue tier |
| 14 | Victory Contracting LLC | HVS LEGACY | P2 | **DISCOVERY** | **$10,000** retainer + **5%** equity (verify signed) | Dev JSON | Hub | Signed PDF path | Equity terms owner review |
| 15+ | Comic Books / Final Installment / 2nd Location | TBD | P3 | **REGISTERED** | — | — | Hub misc | Listed | Classify with owner |

## Artifacts

| Client | Artifact |
|--------|----------|
| ACCG | `ACCG_ONBOARDING_PACKET.md`, `ACCG_SOURCE_INVENTORY.md`, `crm-import/ACCG01_dev_shell.json` |
| Prodigy | `PRODIGY_ONBOARDING_PACKET.md`, `crm-import/PROD01_dev_shell.json` |
| That’s Kava | `THATS_KAVA_ONBOARDING_PACKET.md`, `crm-import/KAVA01_dev_shell.json` |
| Christie’s Place | `CHRISTIES_PLACE_ONBOARDING_PACKET.md`, `crm-import/CHRI01_dev_shell.json` |
| Hart Family Dental | `HART_FAMILY_DENTAL_ONBOARDING_PACKET.md`, `crm-import/HART01_dev_shell.json` |
| Outstanding Auto Detailing | `OUTSTANDING_AUTO_DETAILING_ONBOARDING_PACKET.md`, `crm-import/OAD01_dev_shell.json` |
| Arboretum | `ARBORETUM_ONBOARDING_PACKET.md`, `crm-import/ARBO01_dev_shell.json` |
| Hub discovery (7+) | `HUB_DISCOVERY_ONBOARDING_PACKETS.md`, `crm-import/{PIER,INTL,LIEN,LVAP,COBE,FROC,VICT}01_dev_shell.json` |
| All | `DATA_SOURCE_REGISTER.md`, `inventory/*` |

**Forbidden without owner:** invites, external sharing, outbound email/SMS, reprice, HVCG re-contract, source file mutations.
