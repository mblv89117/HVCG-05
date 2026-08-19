# ACCG_WORKSPACE_PLAN

**Client:** ACCG Inc.  
**ClientCode:** `ACCG01` *(proposed)*  
**As of:** 2026-07-15 18:45 PT  
**Status:** **PLAN ONLY** — no tenant writes, no invites, no Prod  
**Source:** `ACCG_ONBOARDING_PACKET.md` §1, §4  
**Template:** `portal/WORKSPACE_PLAN_TEMPLATE.md`

---

## Client header

| Field | Value |
|-------|-------|
| ClientCode | `ACCG01` |
| LegalName | ACCG Inc. |
| Classification | `HVS_LEGACY_CLIENT` *(default)* / `HVS_TRANSITIONING_CLIENT` if HVCG SOW proven executed — **BL-ACCG-CLASS** |
| ContractingEntity | High Value Solution LLC *(current ops)* |
| ContractingEntity (candidate) | High Value Capital Group LLC — HVCG SOW draft only |
| PortalEnabled | **false** |
| Plan status | `DRAFT` |
| Owner gates | BL-ACCG-1 · BL-ACCG-4 · BL-ACCG-CLASS · BL-C1 |

---

## SharePoint library map

### Canonical document root (owner confirm — BL-ACCG-1)

| Item | Planned value |
|------|---------------|
| Canonical root | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/` |
| `SharePointLibraryUrl` (CRM) | `PLAN_ONLY` — Hub path above until BL-PNP-1 / owner confirms SP URL |
| Target new library | **Deferred** — legacy preservation first; optional future `HVCG_ACCG01` only after migration decision |
| Security group | `HVCG-Client-ACCG01` — **not provisioned** |

### Per-area path table (from onboarding packet)

| Area | Current path (inventory) | Target folder | PortalVisible | Notes |
|------|--------------------------|---------------|---------------|-------|
| Client root | `HVS Hub - Documents/4_Engagements/00_Client Files/ACCG Inc/` | Legacy root | false | Canonical per BL-ACCG-1 default |
| Contracts | `…/05_Contracts & Invoice Docs/` | 11 — Contracts *(if migrated)* | false | Access Plus PDF; invoices |
| Financials | `…/02_Financial Docs/` | 03–04 | false | |
| Bank / AR | `…/04_Bank & AR Docs/` | 06–08 | false | |
| Internal (HVS only) | `…/99_Internal (HVS only)/` | Staff only — **never portal** | false | MSA docx/pdf |
| HVCG client folder | `High Value Capital Group/HVCG/Clients/ACCG/` | Plan reference only | false | HVCG SOW draft — not authorization to reprice |
| Legacy OD tree | `High Value Solution/ACCG/` | Mirror — do not dedupe | false | Submit vs Submit 2 — **duplicate risk HIGH** |
| Personal Drive copies | `4.10.23` copies *(inventory)* | Mirror — do not dedupe | false | |

### Duplicate / mirror inventory (do not dedupe)

| Path | Risk | Action |
|------|------|--------|
| `High Value Solution/ACCG/Submit` vs `Submit 2` | HIGH | Preserve both; flag in CRM notes |
| MSA docx vs pdf in `99_Internal` | MEDIUM | Hash both; TermsSourceHash TBD |
| HVCG `STATEMENT OF WORK….docx` | MEDIUM | Draft status — BL-ACCG-PRICE |

---

## Portal feature checklist (ACCG)

| Feature | Setting | Notes |
|---------|---------|-------|
| PortalEnabled | **false** | Locked |
| External invites | **FORBIDDEN** | BL-C1 |
| Client email / welcome | **FORBIDDEN** | BL-C1; contacts marked DoNotContact in Dev shell |
| Document requests (portal) | Off | Internal doc collection via ops until BL-C1 |
| Pricing on portal | **Off** | BL-ACCG-PRICE — preserve invoiced amount; no HVCG rate card |
| HVCG 00–23 auto-provision | **Deferred** | Legacy path preservation per `PRICING_REGISTER` A |
| Data room | Off | Not in scope until capital engagement defined |

**Legacy guard:** `Classification=HVS_LEGACY_CLIENT` → skip portal invite, welcome email, HVCG re-paper in all automation.

---

## CRM plan fields (not written)

| Field | Planned value |
|-------|---------------|
| `PortalEnabled` | false |
| `PortalAccessGroup` | *(empty)* |
| `SharePointLibraryUrl` | `PLAN_ONLY: HVS Hub …/ACCG Inc/` |
| `Classification` | `HVS_LEGACY_CLIENT` |
| `ContractingEntity` | `High Value Solution LLC` |
| `ClientStage` | Active Client |
| Pricing columns | **null** until BL-ACCG-PRICE — see `crm-import/ACCG01_dev_shell.json` |

---

## Provisioning sequence

**Current phase:** Plan + inventory only.

1. Owner: BL-ACCG-1 confirm Hub root · BL-ACCG-CLASS · BL-ACCG-PRICE.  
2. Complete MSA/Access Plus dollar extract → engagement shell.  
3. Optional Dev CRM shell import (no API write until cleared).  
4. **Do not** run `HVCG_CreateClientWorkspace` for ACCG until owner approves migration off legacy tree.  
5. **Do not** enable portal or invites without BL-C1.

---

## Sign-off

| Role | Status |
|------|--------|
| Plan author | Draft from ACCG_ONBOARDING_PACKET |
| Owner (Manny) | Pending BL-ACCG-1, BL-ACCG-CLASS, BL-C1 |
| Architect | Pending additive Classification columns |

**Related:** `ACCG_ONBOARDING_PACKET.md` · `PRICING_REGISTER.md` §A.2 · `CLIENT_PORTAL_STATUS.md`
