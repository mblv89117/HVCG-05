# WORKSPACE_PLAN_TEMPLATE

**As of:** 2026-07-15 18:45 PT  
**Priority:** #3 — Client Portal  
**Purpose:** Per-client SharePoint library map + portal feature checklist. **Plan only** — no tenant writes, no invites, no Prod.  
**Entity model:** `CLIENT_DATA_MODEL.md` → `WorkspacePlan`  
**CRM mapping:** `CRM_ACCOUNT_CONTACT_ENGAGEMENT_MAPPING.md`

---

## Standing rules (all clients)

| Rule | Default | Gate |
|------|---------|------|
| `PortalEnabled` | **false** | BL-C1 before any external portal access |
| Portal invites / guest sharing | **FORBIDDEN** | BL-C1 |
| Client email / welcome send | **FORBIDDEN** | BL-C1 |
| HVCG rate card on legacy | **BLOCK** | `PRICING_REGISTER` Section A |
| Source file moves / dedupe | **FORBIDDEN** | Owner standing rule |
| Prod tenant writes | **FORBIDDEN** | PROD-1 |

**Legacy clients (`HVS_LEGACY_CLIENT`, `HVS_TRANSITIONING_CLIENT`):** preserve existing document roots; plan may reference Hub/OD paths. Do **not** auto-provision new HVCG 00–23 library until owner approves migration path. Portal remains off until BL-C1.

**New HVCG clients (`HVCG_NEW_CLIENT`):** target standard `HVCG_{ClientCode}` library on Clients Hub with folders 00–23 per `config/hvcg.config.json` → `documentFolderStructure`.

---

## Template — client header

| Field | Value |
|-------|-------|
| ClientCode | `{CLIENTCODE}` |
| LegalName | `{LEGAL_NAME}` |
| Classification | `{HVS_LEGACY_CLIENT \| HVS_TRANSITIONING_CLIENT \| HVCG_NEW_CLIENT}` |
| ContractingEntity | `{High Value Solution LLC \| High Value Capital Group LLC}` |
| PortalEnabled | **false** |
| Plan status | `DRAFT` \| `OWNER_REVIEW` \| `APPROVED` \| `PROVISIONED` |
| Owner gate refs | BL-C1 (invites) · BL-PNP-1 (SP URLs) · client-specific gates |

---

## SharePoint library map

### A — Canonical target (new HVCG clients)

| Item | Planned value |
|------|---------------|
| Site | `HVCG_CLIENTS_HUB_URL` (env) |
| Library name | `HVCG_{ClientCode}` |
| Library URL | `{TBD after BL-PNP-1 / Dev provision}` |
| Security group | `HVCG-Client-{ClientCode}` |
| Folder standard | 00–23 per `documentFolderStructure` (see below) |
| Automation flow | `HVCG_CreateClientWorkspace` (child of onboarding) |

**Standard folders (00–23)**

| # | Folder |
|---|--------|
| 00 | Engagement Administration |
| 01 | Corporate Documents |
| 02 | Ownership and Management |
| 03 | Historical Financials |
| 04 | Current Financials |
| 05 | Tax Returns |
| 06 | Bank Statements |
| 07 | Debt Schedule |
| 08 | Accounts Receivable |
| 09 | Accounts Payable |
| 10 | Payroll and Employees |
| 11 | Contracts |
| 12 | Real Estate |
| 13 | Insurance |
| 14 | Legal and Compliance |
| 15 | Financial Models |
| 16 | Lender Package |
| 17 | Investor Package |
| 18 | Presentations |
| 19 | Deliverables |
| 20 | Meeting Notes |
| 21 | Communications |
| 22 | Approvals |
| 23 | Closed and Archived |

### B — Legacy / migration (existing clients)

| Item | Planned value |
|------|---------------|
| Canonical document root | `{OWNER_CONFIRMED_PATH}` — e.g. Hub `…/00_Client Files/{Name}/` |
| Mirror / duplicate paths | List all; **do not dedupe** |
| HVCG client folder (if any) | `{PATH}` — plan-only reference |
| Target SP library (future) | Optional `HVCG_{ClientCode}` — only after owner migration decision |
| `SharePointLibraryUrl` (CRM) | Plan URL or `PLAN_ONLY` until provisioned |

### C — Per-area path table (fill per client)

| Area | Current path (read-only inventory) | Target folder (00–23 or legacy) | PortalVisible | Notes |
|------|-----------------------------------|---------------------------------|---------------|-------|
| Contracts | | 11 or legacy `05_Contracts…` | false | |
| Financials | | 03–04 or legacy `02_Financial…` | false | |
| Bank / AR | | 06–08 or legacy `04_Bank…` | false | |
| Internal (HVS only) | | N/A — staff only | false | Never portal-expose |
| Engagement admin | | 00 | false | |

---

## Portal feature checklist

Check when building Dev UX (no external users until BL-C1).

| Feature | Required for class | Default | Blocked by |
|---------|-------------------|---------|------------|
| Client dashboard (read-only status) | HVCG new | Off | BL-C1 |
| Document request list + upload | HVCG new | Off | BL-C1 |
| Secure upload to scoped folder | HVCG new | Off | BL-C1 |
| Engagement summary (non-pricing) | All | Off | BL-C1 |
| Pricing display | All | **Off** | Owner approval + signed agreement |
| Messaging / notifications | All | **Off** | BL-C1 |
| Data room (capital raise) | Optional | Off | BL-C1 + capital engagement |
| Legacy client portal migration | Legacy | **Off** | BL-C1 + BL-ACCG-CLASS (per client) |

**Legacy guard:** If `Classification` ∈ legacy classes, skip portal invite, welcome email, and HVCG re-paper steps in all flows.

---

## CRM fields (plan → record)

| Logical (`WorkspacePlan`) | `HVCG_Clients` column | Plan-phase value |
|---------------------------|----------------------|------------------|
| SP site URL plan | `SharePointLibraryUrl` | `PLAN_ONLY` or path |
| Portal plan | `PortalEnabled` | **false** |
| Portal access group | `PortalAccessGroup` | empty |
| Classification | `Classification` *(additive)* | per client |
| ContractingEntity | `ContractingEntity` *(additive)* | per client |

---

## Provisioning sequence (when approved — not now)

1. Owner approves workspace plan (`APPROVED`).  
2. Dev only: run `HVCG_CreateClientWorkspace` or manual equivalent.  
3. Update `SharePointLibraryUrl`; keep `PortalEnabled=false`.  
4. Log in `HVCG_AutomationLogs`.  
5. **Do not** add external users until BL-C1.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Plan author | | | |
| Owner | Manny | | BL-C1 / migration gates |
| Architect | | | Additive CRM columns |

**Related:** `ACCG_WORKSPACE_PLAN.md` (filled example) · `CLIENT_PORTAL_STATUS.md`
