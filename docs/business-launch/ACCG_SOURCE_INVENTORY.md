# ACCG_SOURCE_INVENTORY

**Client:** ACCG Inc. · **Classification:** HVS LEGACY CLIENT  
**As of:** 2026-07-15 18:10 PT  
**Rule:** Inventory only — **do not** move, rename, delete, dedupe, or overwrite. Identical names may differ; preserve via hash + path + mtime + ID.  
**Access this cycle:** Local OneDrive sync for `OneDrive-highvaluesolution.com` was readable. Outlook Graph / SharePoint online PnP live inventory **not** run (needs owner auth). Repo had **no** ACCG client files outside Business Launch docs.

---

## 1. In-repo scan (safe)

| Scope | Result |
|-------|--------|
| `sample-data/clients.csv` | Demo only — **no** ACCG (Summit Ridge, Harbor View, etc.) |
| Main `docs/` | No ACCG artifacts |
| `.worktrees/master-pm-orchestrator/docs/business-launch/*` | Registers + this packet only |
| Agent bus messages | Assignment text only — not source data |

**Conclusion:** Live ACCG source of truth is M365 (OneDrive / HVS Hub / Outlook), not the git repo.

---

## 2. OneDrive roots discovered (read-only)

Base: `/Users/macminipro/Library/CloudStorage/OneDrive-highvaluesolution.com`

| Root ID | Absolute path | Approx files | Role | Notes |
|---------|---------------|--------------|------|-------|
| OD-HUB | `…/HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc` | ~659 | **Primary client workspace** | Subfolders 01–08 + 99_Internal |
| OD-HVS-LEGACY | `…/High Value Solution/ACCG` | ~631 | Legacy HVS working tree | Submit / Submit 2 / Insurance / SEO |
| OD-PERSONAL-DUP | `…/Personal Drive/4.10.23/High Value Solution/ACCG` | ~631 | Likely copy/mirror of legacy | **Do not dedupe** — inventory separately |
| OD-HVCG-CLIENTS | `…/High Value Capital Group/HVCG/Clients/ACCG` | 1 | SOW/Engagement agreement doc | Newer path (2026-06-09) |
| OD-MODELS | `…/HVS Hub - Documents/8_Models & Forecasts/Agentic Process/Beta_ACCG Cash Flow Manager Shared 5.9.26.xlsx` | 1 | Model | Also mirrored under HVCG Models path |
| OD-TEAMS | `…/Microsoft Teams Chat Files/ACCG Buildout.pdf` | 1 | Chat attachment | |
| OD-SB-CRM | `…/Second Brain/01-COMPANIES/HVS Master Client CRM/ACCG Inc.md` | 1 | Internal CRM note | Contacts + $4,539 pattern |
| OD-ROOT-MISC | `…/Riggs vs ACCG Inc.docx` | 1 | Legal/misc at OD root | |

### OD-HUB subfolders (structure only)

| Folder | Purpose hint |
|--------|----------------|
| `01_Intake Docs` | Intake |
| `02_Financial Docs` | Financials |
| `03_Corporate Docs` | Corporate |
| `04_Bank & AR Docs` | Bank / AR |
| `05_Contracts & Invoice Docs` | Contracts, IC packets, Invoices/ |
| `06_Personal` | Personal (sensitive) |
| `07_Projects` | Warehouse / buildout / ROS |
| `08_Archive` | Archive |
| `99_Internal (HVS only)` | MSA, internal invoices, incident, bonding |

---

## 3. Hashed commercial / CRM priority files

| ID | System | Absolute path | Size | Mtime (local) | SHA256 | Notes |
|----|--------|---------------|------|---------------|--------|-------|
| SRC-AGREE-001 | OneDrive | `…/ACCG Inc/99_Internal (HVS only)/HVS_ACCG_Master_Services_Agreement.pdf` | 256906 | 2026-01-29 10:30:53 | `fba090d2d90b3cf34176506d257970669e17e875cfbaf66e4ce793b90807708b` | **Pricing SoR candidate** |
| SRC-AGREE-002 | OneDrive | `…/HVS_ACCG_Master_Services_Agreement.docx` | 187602 | 2026-01-29 10:35:42 | `6fe101b3fc0419b8d4ee8b3068636353f2060f0732749874f3c986a0ed7da0e4` | Same MSA editable |
| SRC-AGREE-003 | OneDrive | `…/05_Contracts & Invoice Docs/High value Solution LLC Access Plus Consulting Agreement.pdf` | 383535 | 2026-01-08 13:23:51 | `09f789ba312c4c1f1cfe356f6d032e06ceec670689356a43b7b4c1b48f47653d` | HVS contracting |
| SRC-SOW-001 | OneDrive | `…/HVCG/Clients/ACCG/STATEMENT OF WORK AND ENGAGEMENT AGREEMENT.docx` | 46948 | 2026-06-09 13:11:26 | `8ce02d9a771c14182c1f50e085b3820dbe84ae9d8dc6b189e88d798f47149272` | Confirm entity on cover |
| SRC-SOW-002 | OneDrive | `…/ACCG INC SCOPE OF WORK.xlsx` | 52493 | 2026-01-08 13:25:12 | `10f921361628b9d8f69605c2ec115ca3a5b8324a7cba2dbe0263ec4138355882` | Scope workbook |
| SRC-PROP-001 | OneDrive | `…/07_Projects/ACCG_ROS_Proposal.pdf` | 334052 | 2026-03-24 13:04:14 | `bd47e8d7f555ee3155abf52052b3a38bef777eb2bedffb35d17ed44534986168` | Proposal |
| SRC-AGREE-LEGACY | OneDrive | `…/High Value Solution/ACCG/Business Plan Agreement 3.29.23.pdf` | 214852 | 2024-04-22 12:10:58 | `b10100212ae7dfbc9eb9833ec16ea96272009ad03274712bf4274dc309fd9dae` | Earlier agreement |
| SRC-CRM-NOTE | OneDrive | `…/HVS Master Client CRM/ACCG Inc.md` | 1498 | 2026-05-19 22:18:40 | `0faa84881ef2f4084ac9a6a95268f1e542fc7ae47664dab5b2bb3a0951dd1b05` | Contacts + revenue pattern |
| SRC-INV-2026-01 | OneDrive | `…/99_Internal (HVS only)/January 2026 Invoice.pdf` | 469308 | 2026-01-29 10:44:03 | `0949553e63483dda8ad8910c8d7151335f6e15201d0a5968292fc27d812b2acc` | Invoice evidence |

Additional invoice PDFs exist under `High Value Solution/ACCG/Submit 2/HVI Internal/` (e.g. ACCG INC INVOICE 12.29.23 / 1.26.24 / 2.26.24 / HVS Invoice 3.29.24) — **not hashed this pass**; append in next inventory cycle.

---

## 4. Systems not inventoried live (need owner)

| System | Why blocked / incomplete | Exact owner prompt needed |
|--------|--------------------------|---------------------------|
| Outlook `manny@highvaluesolution.com` | No Graph/mailbox session for agent | Confirm mailbox(es) to search; authorize Graph **Mail.Read** (or export PST/search folders). Search labels: `ACCG`, `ACCG Inc`, `Ej@accg-inc.com`, invoice subjects from Second Brain. **Metadata only — no send.** |
| Outlook `connect@highvaluesolution.com` | Same | Confirm if ACCG traffic landed here; same auth |
| Outlook `manny@highvaluecapitalgroup.com` | Same | Confirm whether any ACCG threads moved to HVCG mailbox |
| SharePoint online (client sites / libraries beyond OD sync) | PnP Interactive / app auth not invoked this cycle | Confirm site URLs for ACCG (if any beyond HVS Hub synced library); authorize **read-only** PnP against Dev or listed sites — **no sharing changes** |
| Mercury / Square / Cash App | Finance registry only | Owner BL-F1 still **deny connect**; optional CSV export path if approved later |
| Phone/SMS | No export | Confirm if ACCG SMS exists on 702-906-6444 / 725-577-6511 |

### Exact path prompts for owner (copy/paste)

1. **Canonical ACCG folder:** Is `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc` the single source of truth, or also `High Value Solution/ACCG`?  
2. **Dedup policy:** Confirm OD-PERSONAL-DUP is a historical mirror — inventory both; never merge/delete.  
3. **HVCG path:** Confirm whether `High Value Capital Group/HVCG/Clients/ACCG/STATEMENT OF WORK…` is the current SOW under HVS terms or a draft HVCG re-paper — **if HVCG re-paper, do not activate without owner decision** (legacy pricing still preserved).  
4. **Outlook:** Provide any additional search aliases/DBAs for ACCG.  
5. **SharePoint:** Paste any ACCG site/library URLs not synced to this Mac’s OneDrive.  
6. **Pricing extract:** Confirm $4,539/mo from Second Brain matches MSA/Access Plus — finance to paste verified figures into `PRICING_REGISTER`.

---

## 5. Classification suggestion (all sources)

| Source | Suggested classification | Contracting entity |
|--------|--------------------------|--------------------|
| All ACCG OD trees this cycle | **HVS_LEGACY_CLIENT** | High Value Solution LLC |
| HVCG Clients/ACCG SOW path | Still **HVS_LEGACY_CLIENT** until owner says otherwise | Confirm cover page entity |

---

## 6. Inventory status

| Metric | Value |
|--------|-------|
| Roots mapped | 8 |
| Priority files hashed | 9 |
| Full recursive hash of all ~1.2k+ files | **Not done** (deferred — cost/time; next pass by folder) |
| File moves | **0** |
| Outlook messages indexed | **0** (auth pending) |
| SP online lists written | **0** |
