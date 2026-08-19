# DASHBOARD_DATA_MODEL

**As of:** 2026-07-15 18:35 PT  
**Owner:** Executive Dashboard specialist (Priority #6)  
**Audience:** Master PM · Owner · Dev wiring (SharePoint / Power BI — Dev only)  
**Rule:** Metrics reflect **real business registers** — never sample/demo data. Unknown = `null`. Extracts without owner verify = **UNVERIFIED**.

---

## Purpose

Canonical metric definitions for the HVCG Executive Command Center. Each metric maps to a SoR field, refresh cadence, and verification gate. Markdown snapshots are authoritative until Dev CRM rows exist and Power BI is wired.

---

## Metric catalog

| Metric ID | Display name | Definition | Unit | SoR (primary) | SoR (secondary) | Refresh | Verification gate |
|-----------|--------------|------------|------|---------------|-------------------|---------|-------------------|
| `ActiveClients_HVS` | Active clients (HVS) | Count of legacy roster clients with **confirmed active engagement** under High Value Solution LLC. Excludes `FORMER_CLIENT`, hub discovery until classified, and clients marked inactive pending owner confirm. | count | `LEGACY_HVS_CLIENT_REGISTER.md` | `crm-import/*_dev_shell.json` → `client.IsActive` | Weekly / on register update | Owner confirm for WEAK/PARTIAL/FORMER? rows |
| `ActiveClients_HVCG` | Active clients (HVCG) | Count of clients contracted under High Value Capital Group LLC (`HVCG_NEW_CLIENT` or `HVCG_PROSPECT` → Won). Legacy HVS clients **excluded** unless owner re-contracts. | count | `HVCG_NEW_CLIENT_REGISTER.md` | Dev CRM Account list (future) | Weekly | Owner approval before agreement |
| `ContractedMRR_Verified` | Contracted MRR (verified) | Sum of **monthly retainer** amounts where `Verified?=Yes` in `PRICING_REGISTER` §A.1 (MSA/SOW + invoice cross-check complete). Non-monthly (equity, success-only, deposit-only) **excluded**. | USD/mo | `PRICING_REGISTER.md` §A.1 | Dev CRM Engagement.`MonthlyRetainer` where `PricingStatus=VERIFIED` | On verify event | Per-client MSA/invoice extract |
| `ContractedMRR_Unverified` | Contracted MRR (unverified) | Sum of **extracted monthly retainer** figures labeled UNVERIFIED, PARTIAL, or `EXTRACTED_VERIFY_*` — **not** owner-frozen. Each line item must cite source artifact; **never sum competing ACCG candidates**. | USD/mo | `PRICING_REGISTER.md` · `crm-import/*.json` | `inventory/agreement_pricing_extracts.json` | On extract / register update | BL-ACCG-PRICE and per-client verify |
| `PipelineValue` | Pipeline value (HVCG new) | Sum of **open** opportunity amounts for HVCG new business only (Lead → Proposal). Legacy migration track **excluded**. Null when no opportunities or amount unset. | USD | `SALES_PIPELINE_STATUS.md` | Dev CRM Opportunity (future) | Weekly | Owner-priced proposals |
| `WebsiteLeads` | Website leads | Count of form/EVA submissions from public or staging site → CRM Lead in rolling window (default: MTD). Local HTML-only views **excluded**. | count | `FUNNEL_STATUS.md` · `WEBSITE_STATUS.md` | Dev CRM Lead + SP Forms (post BL-W1) | Daily (when live) | BL-W1 (Forms → Dev CRM) |
| `AR_Outstanding` | AR outstanding | Total unpaid invoice balance across active engagements. Requires extracted invoice amounts + status; **no** live bank/processor connect. | USD | Invoice inventory (`ACCG_ONBOARDING_PACKET`, `inventory/*_extract.json`) | Dev CRM Invoice (future) | Weekly | PDF extract + owner AR review |
| `OnboardingPct` | Client onboarding % | Structured migration completeness: checklist fields populated or explicitly MISSING ÷ total checklist fields across named roster. Current formula per `CLIENT_MIGRATION_STATUS.md`. | % | `CLIENT_MIGRATION_STATUS.md` | Per-client onboarding packets | Weekly | Master PM migration track |
| `PortalEnabledCount` | Portal enabled | Count of clients with `PortalEnabled=true` in CRM/dev shell. Invites remain forbidden until BL-C1. | count | `crm-import/*.json` · `CLIENT_PORTAL_STATUS.md` | Dev CRM Account | On change | BL-C1 for external users |

---

## Entity split rules

| Rule | Detail |
|------|--------|
| HVS vs HVCG | Use `ContractingEntity` / `Classification` — not folder path alone |
| Legacy vs new pipeline | Legacy = migration + preservation register; Pipeline = `HVCG_NEW_CLIENT_REGISTER` only |
| MRR vs non-MRR | Arboretum-style deposit + revenue share + equity → **not** in MRR sums; track separately when model extends |
| Demo data | `sample-data/clients.csv` and CRM demo rows **forbidden** as dashboard inputs |

---

## Derived / future metrics (not in v1 snapshot)

| Metric | Blocker |
|--------|---------|
| Client health score | Manual until scoring rules + data |
| Success-fee pipeline | Contract extract incomplete |
| Collections / DSO | BL-F1 + AR extract |
| Hub discovery classified count | Owner classification pass |

---

## JSON shape (Dev CRM / Power BI staging)

```json
{
  "snapshotAt": "ISO-8601",
  "source": "business-launch/registers",
  "metrics": {
    "ActiveClients_HVS": { "value": null, "verified": false, "notes": "" },
    "ActiveClients_HVCG": { "value": null, "verified": false, "notes": "" },
    "ContractedMRR_Verified": { "value": null, "currency": "USD", "verified": true },
    "ContractedMRR_Unverified": { "value": null, "currency": "USD", "verified": false, "lineItems": [] },
    "PipelineValue": { "value": null, "currency": "USD", "verified": true },
    "WebsiteLeads": { "value": null, "window": "MTD", "verified": true },
    "AR_Outstanding": { "value": null, "currency": "USD", "verified": false },
    "OnboardingPct": { "value": null, "verified": true },
    "PortalEnabledCount": { "value": null, "verified": true }
  }
}
```

---

## Cross-links

| Artifact | Role |
|----------|------|
| `executive/DASHBOARD_MOCK_VALUES.md` | Current snapshot from real extracts only |
| `executive/COMMAND_CENTER_WIRE_PLAN.md` | Dev SharePoint / Power BI wiring |
| `EXECUTIVE_DASHBOARD_STATUS.md` | Build status |
| `EXECUTIVE_SNAPSHOT.md` | Weekly owner rollup |
| `CLIENT_DATA_MODEL.md` | CRM field mapping |
| `DATA_SOURCE_REGISTER.md` | DS-SP-CC-DEV · DS-DV · DS-CRM |
