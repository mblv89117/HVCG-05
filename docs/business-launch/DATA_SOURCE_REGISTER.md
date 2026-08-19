# DATA_SOURCE_REGISTER

**As of:** 2026-07-15 18:20 PT  
**Mode:** READ-ONLY inventory — **no** move, rename, delete, dedupe, overwrite, or reorganize  
**Local sync root:** `/Users/macminipro/Library/CloudStorage/OneDrive-highvaluesolution.com`

---

## A — Approved source systems

| Source ID | System | Path / identity | Entity | Access | Status | Notes |
|-----------|--------|-----------------|--------|--------|--------|-------|
| DS-OD-LOCAL | OneDrive (local sync) | `OneDrive-highvaluesolution.com` | HVS + HVCG | Local FS read | **IN PROGRESS** | 1,527 indexed records → `inventory/onedrive_local_inventory.json` |
| DS-OD-HVS | OneDrive folder | `High Value Solution/` | HVS | Local | PARTIAL | Active client folders + discovery clients |
| DS-OD-HVSLLC | OneDrive folder | `High Value Solution LLC/` | HVS | Local | PARTIAL | OPERATIONS/CLIENTS archive |
| DS-OD-HVCG | OneDrive folder | `High Value Capital Group/` | HVCG | Local | PARTIAL | Corp docs + `HVCG/Clients/` |
| DS-OD-HUB | OneDrive / SP sync | `HVS Hub - Documents/` | HVS | Local | **HIGH VALUE** | Canonical engagement tree `4_Engagements/00_Client Files/` |
| DS-OD-CSU | Client Secure Upload | `Client Secure Uploads`, `Client Secure Upload - Manny Barela`, Hub `00_HVS Connect_…` | HVS | Local | EMPTY / PARTIAL | Top-level dirs appear empty locally |
| DS-SP-CC-DEV | SharePoint | `HVCG-CommandCenter-Dev` | HVCG Dev | PnP | AVAILABLE schema | **No PnP session** this cycle |
| DS-SP-CLIENTS | SharePoint online | Client sites beyond OD sync | HVS | PnP | **BLOCKED** | Needs Connect-PnPOnline + owner URLs |
| DS-OL-HVS | Outlook | `manny@` / `connect@highvaluesolution.com` | HVS | Graph | **BLOCKED** | `Get-MgContext` = none |
| DS-OL-HVCG | Outlook | `manny@highvaluecapitalgroup.com` | HVCG | Graph | **BLOCKED** | Same |
| DS-TEAMS | Teams | Chat Files / channels | Both | Graph / local | PARTIAL local | `Microsoft Teams Chat Files` present; no Graph |
| DS-PA-APPS | Power Apps | Dev environment | HVCG | pac | PARTIAL | Profile `HVCG-Dev-Maker` active — app inventory deferred |
| DS-PA-FLOWS | Power Automate | Dev | HVCG | pac | PARTIAL | Deferred |
| DS-DV | Dataverse | `org1131a2b0.crm.dynamics.com` | HVCG Dev | pac | AVAILABLE | No client row writes |
| DS-CRM | CRM lists / solutions | RC-1 + CRM module | HVCG | Repo + Dev | PARTIAL | Demo ≠ legacy roster |
| DS-REPO | Git repo | This repository | HVCG OS | Git | PARTIAL | |
| DS-RC1 | RC-1 package | `releases/RC-1-Development-Baseline/` | HVCG Dev | Git | COMPLETE | Frozen |
| DS-PHONE | Phone/SMS | 702-906-6444, 725-577-6511 | Both | Export only | NOT STARTED | No routing changes |
| DS-FIN | Financial accounts | Mercury / Stripe / banks | Both | Register only | NOT STARTED | **Do not connect** (BL-F1) |

---

## B — Document inventory schema (per record)

Stored in JSON manifests under `docs/business-launch/inventory/`:

| Field | Description |
|-------|-------------|
| Path | Absolute or OD-relative path |
| Owner | ACL TBD until Graph/PnP |
| Client | Named roster match or blank |
| Entity | HVS / HVCG / UNKNOWN |
| Document Type | Folder / PDF / Word / Excel / … |
| Created / Modified | From filesystem |
| Estimated Importance | HIGH / MEDIUM / LOW |
| Recommended CRM Record | Suggested mapping |
| Recommended SharePoint Library | Suggested target (plan only) |
| Duplicate Risk | UNKNOWN until hash compare |
| Relationship to Existing Client | Named or discovery |

**Manifests**

| File | Contents |
|------|----------|
| `inventory/onedrive_local_inventory.json` | 1,527 folder/file records (depth-limited) |
| `inventory/agreement_pricing_extracts.json` | Read-only text extracts from key DOCX agreements |
| `inventory/DOCUMENT_INVENTORY_SUMMARY.md` | Human rollup |

---

## C — Hub client folders discovered (`HVS Hub - Documents/4_Engagements/00_Client Files/`)

| Folder | Roster status | Entity hint |
|--------|---------------|-------------|
| ACCG Inc | **Named — P1 migration** | HVS (+ HVCG draft SOW) |
| Prodigy Games | **Named** | HVS |
| Christie's Place | **Named** | HVS |
| Pierlo Inc (DBA Baker's Travertine Power Clean) | Discovery | HVS |
| Integrity Lift Solutions LLC | Discovery | HVS |
| Lien Partners LLC | Discovery | HVS |
| LV Appraisals | Discovery | HVS |
| Colorado Beef | Discovery | HVS |
| Frocovery | Discovery | HVS |
| Victory Contracting | Discovery | HVS |
| Comic Books / 2nd Location / Final Installment | Discovery / misc | HVS |
| 0_Client_Folder (Template) | Template | — |
| 00_HVS Connect_Client Secure Document Upload | Secure upload | HVS |

---

## D — Named roster path hits (local)

| Client | Primary paths found | Agreements located |
|--------|---------------------|--------------------|
| ACCG Inc. | Hub `ACCG Inc`; OD `High Value Solution/ACCG`; HVCG `HVCG/Clients/ACCG` | MSA (HVS), Access Plus PDF, HVCG SOW draft |
| Prodigy Games LLC | Hub `Prodigy Games` | Fractional CFO $7,500/mo; Strategic Capital; Kava bookkeeping agr. co-located |
| That’s Kava LLC | **No dedicated folder** | Referenced in Prodigy `Prodigy_ThatsKava_Bookkeeping_Services_Agreement_FL.docx` |
| Christie’s Place LLC | Hub `Christie's Place`; mortgage paths | Folder present — deep extract next |
| Hart Family Dental | HVCG `Clients/Hart Family Dental`; Personal Drive Old Business | Partial |
| Outstanding Auto Detailing LLC | Personal Drive Tim Bell operating agreements | Weak / archive |
| Arboretum LLC | OD `High Value Solution/Arboretum LLC` | Consulting Agreement 1.4.23 |

---

## E — Blocked without owner auth (inventory only)

| Gate | Why | What unlocks |
|------|-----|--------------|
| Microsoft Graph sign-in | Outlook / Teams / online Drive metadata | Owner interactive Graph auth (read-only scopes) |
| PnP SharePoint sign-in | Live SP libraries beyond sync | `Connect-PnPOnline` to owner-confirmed URLs |
| Financial account APIs | Mercury/Stripe | Explicit connect approval (deny until asked) |

**No mutations performed.** Sensitive paths noted by path only (e.g. backup-code filenames under HVCG corp) — contents not used in CRM shells.
