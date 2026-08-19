#!/usr/bin/env python3
"""Generate client PROFILE.md packs from ALL_CLIENTS_DISCOVERY.json (read-only)."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DISCOVERY_PATH = BASE / "inventory" / "ALL_CLIENTS_DISCOVERY.json"
CLIENTS_DIR = BASE / "clients"
GENERATED_AT = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# Named P1 roster — discovery name aliases -> code
NAMED_CODES = {
    "ACCG": "ACCG01",
    "ACCG Inc": "ACCG01",
    "Prodigy Games": "PROD01",
    "Christie's Place": "CHRI01",
    "Christie": "CHRI01",
    "Arboretum LLC": "ARBO01",
    "Ormond Arboretum": "ARBO01",
    "Hart Family Dental": "HART01",
}

# Hub discovery — DISC_## codes (per mission spec)
HUB_DISCOVERY = {
    "Pierlo Inc (DBA Baker's Travertine Power Clean)": ("DISC_01", "PIER01"),
    "Pierlo Inc": ("DISC_01", "PIER01"),
    "Integrity Lift Solutions LLC": ("DISC_02", "INTL01"),
    "Lien Partners LLC": ("DISC_03", "LIEN01"),
    "LV Appraisals": ("DISC_04", "LVAP01"),
    "Colorado Beef": ("DISC_05", "COBE01"),
    "Frocovery": ("DISC_06", "FROC01"),
    "Victory Contracting": ("DISC_07", "VICT01"),
    "Comic Books": ("DISC_08", None),
    "Final Installment": ("DISC_09", None),
    "2nd Location": ("DISC_10", None),
}

# Enrichment from onboarding packets / pricing register
ENRICHMENT = {
    "ACCG01": {
        "legal_name": "ACCG Inc.",
        "classification": "HVS_LEGACY_CLIENT (TRANSITIONING candidate)",
        "contracting_entity": "High Value Solution LLC (HVCG SOW draft on file — unverified)",
        "contacts": [
            "Earl Jackson — President — Ej@accg-inc.com — 321-363-6005",
            "Sandra Vasquez — Finance — MISSING",
            "Leon Reed — Principal — MISSING",
        ],
        "timeline": [
            "March 2023 — HVS advisory relationship begins (MSA recital)",
            "2023-10-25 — Access Plus Consulting Agreement dated (path only; OCR pending)",
            "2025-07-25 — Capital Advisory agreement dated (superseded by MSA draft)",
            "2026-02-01 — MSA Scale Tier effective date in draft (signature unverified)",
            "2026-05 — INV-2026-05-ACCG-AP $4,539 Access Plus invoice",
        ],
        "engagement": "Fractional CFO / Capital Advisory — active legacy HVS; HVCG transition draft exists",
        "pricing": """| Field | Status | Value / evidence |
|-------|--------|------------------|
| Original (contracted) | **TBD / MISSING extract** | Access Plus PDF not OCR'd; HVCG SOW cites prior ~$4,562/mo |
| Current (observed) | **INVOICE-VERIFIED** | **$4,539/mo** Access Plus — `HVS_Invoice_ACCG_2026-5.pdf` INV-2026-05 |
| MSA Scale draft | **UNVERIFIED / NOT APPLIED** | $12,500/mo — `HVS_ACCG_Master_Services_Agreement.docx` |
| HVCG SOW draft | **UNVERIFIED / NOT APPLIED** | $6,000/mo + $3,000 setup — `STATEMENT OF WORK AND ENGAGEMENT AGREEMENT.docx` |
| Success fees (MSA draft) | UNVERIFIED | Debt 1.5%; equity 3.0% |
| Action | **PRESERVE** | Freeze at $4,539 until owner BL-ACCG-PRICE |""",
        "funding": "Active capital advisory; $10M corporate complex financing referenced in HVCG SOW draft — **UNVERIFIED**",
        "risks": [
            "Competing pricing instruments (Access Plus vs MSA $12.5k vs HVCG $6k)",
            "Duplicate folder trees (Submit vs Submit 2; OD vs Hub vs HVCG)",
            "Entity transition HVS→HVCG unsigned",
        ],
        "renewal": "MSA draft 12-month initial term if executed; Access Plus month-to-month pattern observed",
        "cross_sell": "Future: SKU-CAP-GROWTH, SKU-CAP-ENT, agentic AI/ROS (per HVCG SOW draft — not current price)",
        "packet": "ACCG_ONBOARDING_PACKET.md",
        "crm": "crm-import/ACCG01_dev_shell.json",
    },
    "PROD01": {
        "legal_name": "Prodigy Games LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["Ryan Gnieski — President — MISSING email — agreement rep", "MISSING — Graph BLOCKED"],
        "timeline": [
            "2025-01-12 — Fractional CFO Agreement effective date (Growth Tier)",
        ],
        "engagement": "Fractional CFO Growth Tier — affiliated entities under Ryan Gnieski",
        "pricing": """| Field | Status | Value / evidence |
|-------|--------|------------------|
| Monthly retainer | **UNVERIFIED signed** | **$7,500/mo** — `HVS_Prodigy_Games_Fractional_CFO_Agreement.docx` |
| Initial term | Extracted | 6 months non-cancelable ($45,000 total) |
| Overage | Extracted | $300/hr |
| Success fees | Extracted | Debt 1.5%; equity 3.0%; M&A 2-4% |
| Strategic Capital Agreement | Separate instrument | $50k investor deal — not HVS retainer |
| Action | **PRESERVE** | Verify signed PDF before CRM import |""",
        "funding": "Capital advisory scope in CFO agreement; Strategic Capital Agreement separate",
        "risks": ["That's Kava co-filed under Prodigy contracts", "690 Hub files — high document volume"],
        "renewal": "6-month initial term per agreement extract",
        "cross_sell": "Future: SKU-CAP-CORE, SKU-CAP-GROWTH (not current price)",
        "packet": "PRODIGY_ONBOARDING_PACKET.md",
        "crm": "crm-import/PROD01_dev_shell.json",
    },
    "CHRI01": {
        "legal_name": "Christie's Place LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": [
            "Christie Falk — christiefalk@yahoo.com — (702) 465-7076",
            "Irwin Falk — annuity package — relationship TBD",
        ],
        "timeline": [
            "2026-06-19 — Invoices #0000128 and #0000129 due (Square)",
        ],
        "engagement": "Business Consulting; possible annuity/insurance advisory subfolder",
        "pricing": """| Field | Status | Value / evidence |
|-------|--------|------------------|
| Invoice #0000128 | **EXTRACTED** | **$4,750** Business Consulting — due 2026-06-19 |
| Invoice #0000129 | **EXTRACTED** | **$4,750** Business Consulting — due 2026-06-19 |
| Contract / MSA | **MISSING** | No executed retainer located |
| Action | **PRESERVE** | Confirm if dual invoices = 2× monthly or separate engagements |""",
        "funding": "**MISSING** — confirm engagement type",
        "risks": ["Mortgage ops folder duplicate", "Annuity subfolder may indicate different service line"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-HR-SENIOR consulting, SKU-CAP-CORE",
        "packet": "CHRISTIES_PLACE_ONBOARDING_PACKET.md",
        "crm": "crm-import/CHRI01_dev_shell.json",
    },
    "ARBO01": {
        "legal_name": "Arboretum LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["Ronald F. Beirman III — 396 Trafalga Ave, Port Orange, FL 32127"],
        "timeline": ["2024-01-04 — Consulting Agreement dated"],
        "engagement": "Business capitalization / nursery acquisition advisory — confirm active vs former",
        "pricing": """| Field | Status | Value / evidence |
|-------|--------|------------------|
| Deposit | **EXTRACTED** | **$7,500** non-refundable wire — `Consulting Agreement 1.4.23.docx` |
| Revenue share | **EXTRACTED** | **1% quarterly gross revenue** post-purchase |
| Equity | **EXTRACTED** | **5% voting equity** in perpetuity |
| Action | **PRESERVE** | Owner confirm IsActive |""",
        "funding": "Capital raise for Arboretum nursery acquisition",
        "risks": ["Ormond Arboretum separate ops folder", "Equity terms require owner review"],
        "renewal": "Perpetuity equity — no standard renewal",
        "cross_sell": "Future: SKU-CAP-ENT, SKU-SUCCESS-EQUITY",
        "packet": "ARBORETUM_ONBOARDING_PACKET.md",
        "crm": "crm-import/ARBO01_dev_shell.json",
    },
    "KAVA01": {
        "legal_name": "That's Kava LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC (via Prodigy umbrella)",
        "contacts": ["Ryan Gnieski — President Prodigy — agreement rep", "Doug Mafett — Bookkeeper — do not contact"],
        "timeline": ["Agreement co-located under Prodigy Games contracts folder"],
        "engagement": "Bookkeeping services bundled with Prodigy; CFO via PROD01",
        "pricing": """| Field | Status | Value / evidence |
|-------|--------|------------------|
| Bookkeeping | **EXTRACTED** | **$1,000/mo** flat Prodigy+Kava — `Prodigy_ThatsKava_Bookkeeping_Services_Agreement_FL.docx` |
| CFO (parent) | Via PROD01 | **$7,500/mo** — separate instrument |
| Action | **PRESERVE** | Verify live vs draft |""",
        "funding": "**MISSING**",
        "risks": ["No dedicated Hub folder", "Bookkeeper of record is Doug Mafett not HVS"],
        "renewal": "Month-to-month per bookkeeping agreement",
        "cross_sell": "Future: SKU-CAP-CORE",
        "packet": "THATS_KAVA_ONBOARDING_PACKET.md",
        "crm": "crm-import/KAVA01_dev_shell.json",
        "discovery_override": None,
    },
    "HART01": {
        "legal_name": "Hart Family Dental",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "**OWNER VERIFY** — HVCG folder; no executed SOW",
        "contacts": [
            "Lindsay — marketing doc addressee",
            "Desert Hot Springs office — 760.329.6713",
        ],
        "timeline": ["Marketing Campaign Access doc — date **MISSING**"],
        "engagement": "Marketing access checklist only — HVS advisory **MISSING**",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| HVS retainer | **MISSING** | No fee instrument |
| Marketing fee | **MISSING** | Ad budget TBD in doc |
| Action | **PRESERVE** | Owner confirm active + entity |""",
        "funding": "**MISSING**",
        "risks": ["Weak shell — may not be active client", "HVCG vs HVS entity ambiguity"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-CORE, business growth services",
        "packet": "HART_FAMILY_DENTAL_ONBOARDING_PACKET.md",
        "crm": "crm-import/HART01_dev_shell.json",
    },
    "OUTS01": {
        "legal_name": "Outstanding Auto Detailing LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC (unconfirmed)",
        "contacts": [
            "Philip Garcia — Manager — philipgarcia2020@gmail.com",
            "Tim Bell — Investor — dcbell.tt@gmail.com",
            "Dawn Vanname Bell — Treasurer — dcbell.tt@gmail.com",
        ],
        "timeline": ["Operating Agreement Revised — date **MISSING** from extract"],
        "engagement": "HVS advisory **NOT FOUND** — member loan structure only",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| HVS consulting | **MISSING** | No HVS agreement in inventory |
| Member loan (Schedule E) | Extracted | $50,000; 8% gross revenue share; $50k cap |
| Action | **PRESERVE** | Owner confirm HVS relationship |""",
        "funding": "Member-funded via Tim Bell — not HVS capital advisory",
        "risks": ["Weak shell — HVS relationship unconfirmed", "CRM alias OAD01"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-CORE",
        "packet": "OUTSTANDING_AUTO_DETAILING_ONBOARDING_PACKET.md",
        "crm": "crm-import/OAD01_dev_shell.json",
        "discovery_override": None,
    },
    "DISC_01": {
        "legal_name": "Pierlo Inc (DBA Baker's Travertine Power Clean)",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC (assumed)",
        "contacts": ["**MISSING**"],
        "timeline": ["**MISSING** — lender soft quotes only"],
        "engagement": "Discovery — intake template; capital raise / lender packaging prospect?",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| HVS retainer | **MISSING** | Soft Quote.docx = third-party lending rates only |
| Action | **PRESERVE** | Owner classify |""",
        "funding": "Lender soft quotes in folder — not HVS-funded",
        "risks": ["No HVS agreement found", "Duplicate Pierlo Inc OD folder (7 files)"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-CORE, SKU-SUCCESS-DEBT",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Pierlo",
        "crm": "crm-import/PIER01_dev_shell.json",
    },
    "DISC_02": {
        "legal_name": "Integrity Lift Solutions LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["**MISSING** — draft DOCX names Expert Nursing — verify"],
        "timeline": ["2024-11-26 — Consulting Agreement signed PDF path", "2024-11-27 — HVS Invoice path"],
        "engagement": "Consulting — verify signed instrument",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| Retainer (candidate) | **UNVERIFIED** | **$10,000** non-refundable — draft DOCX; verify signed PDF |
| Invoice | OCR pending | `HVS Invoice 11.27.24 Integrity Lift Solutions.pdf` |
| Action | **PRESERVE** | Confirm client name on signed instrument |""",
        "funding": "**MISSING**",
        "risks": ["Draft DOCX client-name mismatch", "Archive comp- folder exists"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-GROWTH",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Integrity Lift",
        "crm": "crm-import/INTL01_dev_shell.json",
    },
    "DISC_03": {
        "legal_name": "Lien Partners LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["**MISSING**"],
        "timeline": [
            "2025-11-14 — Close-Readiness Sprint SOW",
            "2025-07-08 — Consulting Agreement signed PDF path",
        ],
        "engagement": "Close-Readiness Sprint — confirm sprint vs ongoing",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| Sprint retainer | **EXTRACTED** | **$4,562/mo** — `LP-HVS_Exhibit_A1_Close-Readiness_Sprint_SOW_2025-11-14.docx` |
| Fee-alignment credit | Extracted | 1 month if forward-flow docs in 60 days |
| Success fee | Extracted | Controlling-equity acquisition only |
| EAM referral fees | Separate | 2% tranche — separate fee stream |
| Action | **PRESERVE** | Confirm sprint vs ongoing |""",
        "funding": "Acquisition close-readiness — EAM broker stack",
        "risks": ["EAM fee stack vs LP client record", "198 files — complex internal folder"],
        "renewal": "Sprint SOW — term TBD from signed PDF",
        "cross_sell": "Future: SKU-CAP-ENT, SKU-SUCCESS-EQUITY",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Lien Partners",
        "crm": "crm-import/LIEN01_dev_shell.json",
    },
    "DISC_04": {
        "legal_name": "LV Appraisals",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "**MISSING**",
        "contacts": ["**MISSING**"],
        "timeline": ["**MISSING**"],
        "engagement": "Website/marketing docs — confirm client vs prospect",
        "pricing": "| Field | Status | Value |\n|-------|--------|-------|\n| HVS retainer | **MISSING** | No agreement found |",
        "funding": "**MISSING**",
        "risks": ["May be marketing-only prospect"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-CORE",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § LV Appraisals",
        "crm": "crm-import/LVAP01_dev_shell.json",
    },
    "DISC_05": {
        "legal_name": "Colorado Beef",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "**MISSING**",
        "contacts": ["Jeff — intro email PDF only"],
        "timeline": ["**MISSING** — one-pager intro PDF"],
        "engagement": "Intro/prospect — classify with owner",
        "pricing": "| Field | Status | Value |\n|-------|--------|-------|\n| HVS retainer | **MISSING** | Intro PDF only |",
        "funding": "**MISSING**",
        "risks": ["Single-file folder — minimal evidence"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-FRA, SKU-CAP-CORE",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Colorado Beef",
        "crm": "crm-import/COBE01_dev_shell.json",
    },
    "DISC_06": {
        "legal_name": "Frocovery LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["Fernando Chaidez — Sole Member"],
        "timeline": ["2026-03-10 — Business Development Agreement effective date"],
        "engagement": "Business development — tiered monthly",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| Setup | **EXTRACTED** | **$2,500** ($1,250 + $1,250) |
| Monthly tiered | **EXTRACTED** | $500 → $1,000 → $1,500 → $2,500 by revenue band |
| Optional third-party | Note | RocketSearch ~$300/mo; bookkeeping ~$300/mo |
| Action | **PRESERVE** | Confirm live revenue tier |""",
        "funding": "Capital success fees per agreement §6 — verify %",
        "risks": ["3-month initial term — confirm renewal"],
        "renewal": "3-month initial term per BDA extract",
        "cross_sell": "Future: SKU-CAP-GROWTH",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Frocovery",
        "crm": "crm-import/FROC01_dev_shell.json",
    },
    "DISC_07": {
        "legal_name": "Victory Contracting LLC",
        "classification": "HVS_LEGACY_CLIENT",
        "contracting_entity": "High Value Solution LLC",
        "contacts": ["**MISSING**"],
        "timeline": ["Signed PDF path — execution date **MISSING**"],
        "engagement": "Business consulting + equity — verify signed",
        "pricing": """| Field | Status | Value |
|-------|--------|-------|
| Retainer | **UNVERIFIED** | **$10,000** on initial funding (24h wire) — DOCX extract |
| Equity | **UNVERIFIED** | **5% non-dilutable voting equity** in perpetuity |
| Action | **PRESERVE** | Owner equity review required |""",
        "funding": "Initial funding trigger for retainer",
        "risks": ["Equity terms require owner review", "Obligation if funding rejected"],
        "renewal": "**MISSING**",
        "cross_sell": "Future: SKU-CAP-ENT",
        "packet": "HUB_DISCOVERY_ONBOARDING_PACKETS.md § Victory Contracting",
        "crm": "crm-import/VICT01_dev_shell.json",
    },
}

# Skip aggregate/meta folders that are not real clients
SKIP_NAMES = {
    "Access Plus Member", "Prospects", "Startups", "REFERRAL PARTNERS",
    "Training", "Clients1",
}

# comp- archive duplicates map to primary discovery names
COMP_ALIASES = {
    "comp-ACCG Inc": "ACCG Inc",
    "comp-Prodigy Games": "Prodigy Games",
    "comp-Integrity Lift Solutions LLC": "Integrity Lift Solutions LLC",
    "comp-Lien Partners LLC": "Lien Partners LLC",
    "comp-Pierlo Inc (DBA Baker's Travertine Power Clean)": "Pierlo Inc (DBA Baker's Travertine Power Clean)",
    "comp-Victory Contracting": "Victory Contracting",
    "comp-LV Appraisals": "LV Appraisals",
    "comp-Final Installment": "Final Installment",
}


def classify_source(sources):
    if "HVCG_Clients" in sources:
        return "HVCG_CLIENT"
    if any(s in sources for s in ("OD_High_Value_Solution", "HVS_LLC_OPS_CLIENTS", "HVS_Hub_Client_Files")):
        return "HVS_LEGACY"
    return "UNKNOWN"


def source_label(sources):
    return ", ".join(sources)


def assign_code(name, disc_counter):
    if name in NAMED_CODES:
        return NAMED_CODES[name]
    if name in HUB_DISCOVERY:
        return HUB_DISCOVERY[name][0]
    if name.startswith("comp-"):
        primary = COMP_ALIASES.get(name, name)
        if primary in NAMED_CODES:
            return NAMED_CODES[primary] + "_ARCH"
        if primary in HUB_DISCOVERY:
            return HUB_DISCOVERY[primary][0] + "_ARCH"
        return f"DISC_{disc_counter[0]:02d}_ARCH"
    disc_counter[0] += 1
    return f"DISC_{disc_counter[0]:02d}"


def format_census(census):
    return (
        f"| Type | Count |\n|------|-------|\n"
        f"| Agreements | {census.get('agreements', 0)} |\n"
        f"| Invoices | {census.get('invoices', 0)} |\n"
        f"| Proposals | {census.get('proposals', 0)} |\n"
        f"| Meetings | {census.get('meetings', 0)} |\n"
        f"| Emails | {census.get('emails', 0)} |\n"
        f"| Other | {census.get('other', 0)} |\n"
        f"| **Total files** | **{census.get('files', 0)}** |"
    )


def build_profile(code, discovery_name, data, enrichment=None):
    e = enrichment or {}
    census = data.get("census", {})
    paths = data.get("paths", [])
    sources = data.get("sources", [])
    classification = e.get("classification", classify_source(sources))
    legal = e.get("legal_name", discovery_name)
    contracting = e.get("contracting_entity", "High Value Solution LLC" if "HVS" in classification else "**MISSING**")

    contacts = e.get("contacts", ["**MISSING** — Outlook Graph BLOCKED_CREDENTIALS"])
    timeline = e.get("timeline", ["**MISSING** — no dated filenames extracted this pass"])
    engagement = e.get("engagement", f"Discovery client — {source_label(sources)}")
    pricing = e.get("pricing", """| Field | Status | Value |
|-------|--------|-------|
| HVS/HVCG retainer | **MISSING** | No pricing extract this pass |
| Action | **PRESERVE** | Legacy rules apply if HVS_LEGACY |""")
    deliverables = e.get("deliverables", "**MISSING** — unknown")
    funding = e.get("funding", "**MISSING**")
    comms = e.get("comms", f"Local email/msg files: **{census.get('emails', 0)}** — Graph/Outlook **BLOCKED_CREDENTIALS**")
    risks = e.get("risks", ["Document inventory only — engagement status unverified"])
    renewal = e.get("renewal", "**MISSING**")
    cross_sell = e.get("cross_sell", "Future opportunity labels only — see PRICING_REGISTER.md Section B (not current price)")

    paths_block = "\n".join(f"- `{p}`" for p in paths) if paths else "- **MISSING**"

    contacts_block = "\n".join(f"- {c}" for c in contacts)
    timeline_block = "\n".join(f"- {t}" for t in timeline)
    risks_block = "\n".join(f"- {r}" for r in risks) if isinstance(risks, list) else f"- {risks}"

    packet = e.get("packet", "")
    crm = e.get("crm", "")
    refs = []
    if packet:
        refs.append(f"- Onboarding: `{packet}`")
    if crm:
        refs.append(f"- CRM shell: `{crm}`")
    refs.append("- Pricing register: `PRICING_REGISTER.md` Section A (legacy preserve)")
    refs_block = "\n".join(refs)

    crm_alias = ""
    for hub_name, (disc, crm_code) in HUB_DISCOVERY.items():
        if code == disc and crm_code:
            crm_alias = f"\n**CRM alias:** `{crm_code}`"
            break
    if code == "OUTS01":
        crm_alias = "\n**CRM alias:** `OAD01`"

    return f"""# Client Profile — {legal}

**ClientCode:** `{code}`{crm_alias}  
**Discovery name:** {discovery_name}  
**Generated:** {GENERATED_AT}  
**Mode:** READ-ONLY intelligence pack

---

## 1. Client Profile

| Field | Value |
|-------|-------|
| Legal name | {legal} |
| Classification | {classification} |
| Contracting entity | {contracting} |
| Discovery sources | {source_label(sources)} |
| Status | Shell / discovery — no Prod writes |

### Contacts (do not contact)

{contacts_block}

---

## 2. Timeline

{timeline_block}

*Dates from filenames/agreements only — none invented.*

---

## 3. Current engagement

{engagement}

---

## 4. Pricing

{pricing}

*Legacy HVS: PRESERVE per PRICING_REGISTER.md — never apply HVCG rate card as current price.*

---

## 5. Outstanding deliverables

{deliverables}

---

## 6. Funding status

{funding}

---

## 7. Communication history

{comms}

*No Graph/Outlook auth this cycle — local files only.*

---

## 8. Documents

### Key paths

{paths_block}

### Type counts (filesystem census)

{format_census(census)}

---

## 9. Tasks

**MISSING** — task system not connected this pass

---

## 10. Risks

{risks_block}

---

## 11. Renewal opportunities

{renewal}

---

## 12. Cross-sell opportunities

{cross_sell}

*HVCG rate card SKUs are future opportunity labels only — not current contracted pricing.*

---

## References

{refs_block}
"""


def main():
    with open(DISCOVERY_PATH) as f:
        discovery = json.load(f)

    CLIENTS_DIR.mkdir(parents=True, exist_ok=True)
    disc_counter = [10]  # DISC_11+ for non-hub discoveries
    assignments = []
    code_to_name = {}

    clients = discovery["clients"]

    # Process discovery clients
    for name, data in sorted(clients.items()):
        if name in SKIP_NAMES:
            continue
        code = assign_code(name, disc_counter)
        if code.endswith("_ARCH"):
            # Still create archive profile but note duplicate
            pass
        enrichment = ENRICHMENT.get(code.replace("_ARCH", ""))
        if enrichment and code.endswith("_ARCH"):
            enrichment = {**enrichment, "engagement": enrichment.get("engagement", "") + " — **ARCHIVE duplicate folder**"}
        profile = build_profile(code, name, data, enrichment)
        out_dir = CLIENTS_DIR / code
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "PROFILE.md").write_text(profile, encoding="utf-8")
        assignments.append((code, name, data.get("census", {}).get("files", 0)))
        code_to_name[code] = name

    # Manual profiles not in discovery JSON
    for code in ("KAVA01", "OUTS01"):
        if code not in code_to_name:
            e = ENRICHMENT[code]
            fake_data = {
                "sources": ["MANUAL_ROSTER"],
                "paths": [],
                "census": {"agreements": 0, "invoices": 0, "proposals": 0, "meetings": 0, "emails": 0, "other": 0, "files": 0},
            }
            if code == "KAVA01":
                fake_data["paths"] = [
                    "/Users/macminipro/Library/CloudStorage/OneDrive-highvaluesolution.com/HVS Hub - Documents/4_Engagements/00_Client Files/Prodigy Games/05_Contracts & Invoice Docs/"
                ]
                fake_data["census"]["agreements"] = 2
            if code == "OUTS01":
                fake_data["paths"] = [
                    "/Users/macminipro/Library/CloudStorage/OneDrive-highvaluesolution.com/Personal Drive/4.10.23/Tim Bell/"
                ]
                fake_data["census"]["other"] = 1
            profile = build_profile(code, e["legal_name"], fake_data, e)
            out_dir = CLIENTS_DIR / code
            out_dir.mkdir(parents=True, exist_ok=True)
            (out_dir / "PROFILE.md").write_text(profile, encoding="utf-8")
            assignments.append((code, e["legal_name"], 0))

    # INDEX.md
    lines = [
        "# Client Profile Index",
        "",
        f"**Generated:** {GENERATED_AT}  ",
        f"**Total profiles:** {len(assignments)}  ",
        f"**Discovery source:** `inventory/ALL_CLIENTS_DISCOVERY.json` ({discovery['client_count']} raw entries; {len(assignments)} profiles after skip/merge)",
        "",
        "## Named P1 roster",
        "",
        "| Code | Legal / discovery name | Files | Profile |",
        "|------|------------------------|-------|---------|",
    ]
    p1 = ["ACCG01", "PROD01", "CHRI01", "ARBO01", "KAVA01", "HART01", "OUTS01"]
    for c in p1:
        match = next((a for a in assignments if a[0] == c), None)
        if match:
            lines.append(f"| `{c}` | {match[1]} | {match[2]} | [PROFILE]({c}/PROFILE.md) |")

    lines += [
        "",
        "## Hub discovery (DISC_##)",
        "",
        "| Code | CRM alias | Discovery name | Files | Profile |",
        "|------|-----------|----------------|-------|---------|",
    ]
    for name, (disc, crm) in sorted(HUB_DISCOVERY.items(), key=lambda x: x[1][0]):
        if name == "Pierlo Inc":
            continue  # prefer DBA name row
        match = next((a for a in assignments if a[0] == disc and a[1] == name), None)
        if not match:
            match = next((a for a in assignments if a[0] == disc), None)
        if match:
            alias = f"`{crm}`" if crm else "—"
            lines.append(f"| `{disc}` | {alias} | {match[1]} | {match[2]} | [PROFILE]({disc}/PROFILE.md) |")

    lines += [
        "",
        "## All discovered clients",
        "",
        "| Code | Discovery name | Files | Profile |",
        "|------|----------------|-------|---------|",
    ]
    for code, name, files in sorted(assignments, key=lambda x: x[0]):
        lines.append(f"| `{code}` | {name} | {files} | [PROFILE]({code}/PROFILE.md) |")

    (CLIENTS_DIR / "INDEX.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # SOURCE_COVERAGE.md
    coverage = """# Source Coverage — Client Intelligence

**Generated:** {generated}  
**Specialist:** Client Intelligence (crm)  
**Mode:** READ-ONLY

## Source status

| Source ID | System | Status | Impact on profiles |
|-----------|--------|--------|-------------------|
| DS-OD-LOCAL | OneDrive local sync | **AVAILABLE** | Paths, census, local email/msg PDFs |
| DS-OD-HUB | HVS Hub client files | **AVAILABLE** | Primary engagement trees |
| DS-OL-HVS | Outlook (HVS) | **BLOCKED_CREDENTIALS** | Contacts, comms history incomplete |
| DS-OL-HVCG | Outlook (HVCG) | **BLOCKED_CREDENTIALS** | Contacts incomplete |
| DS-TEAMS | Teams / Graph | **BLOCKED_CREDENTIALS** | Chat history not extracted |
| DS-SP-CLIENTS | SharePoint online | **BLOCKED_CREDENTIALS** | Beyond OD sync — URLs needed |
| DS-SP-CC-DEV | SharePoint Command Center Dev | **BLOCKED_CREDENTIALS** | No PnP session |
| DS-DV | Dataverse Dev | **AVAILABLE** (no writes) | CRM shells drafted only |
| DS-FIN | Mercury / Stripe / banks | **NOT STARTED** | Payment verification partial via invoice PDFs only |

## Coverage gaps

| Gap | Clients affected | Mitigation |
|-----|------------------|------------|
| Graph/Outlook blocked | All | Local email PDF count only; contacts MISSING unless in agreements |
| Signed PDF OCR incomplete | ACCG Access Plus, Integrity Lift invoice, Victory/Arboretum signed PDFs | Flag UNVERIFIED; paths recorded |
| Engagement status unconfirmed | HART01, OUTS01, ARBO01, DISC_04–05 | Owner gates in OWNER_DECISIONS.md |
| Archive duplicate folders | comp-* entries | Separate _ARCH profiles; do not dedupe source |
| KAVA01 / OUTS01 not in discovery JSON | KAVA01, OUTS01 | Manual roster profiles from onboarding packets |

## Profile completeness

| Metric | Value |
|--------|-------|
| Profiles generated | {count} |
| P1 enriched | 7 |
| Hub DISC enriched | 7 |
| Pricing verified (invoice/agreement extract) | ACCG01, CHRI01, PROD01 (partial), ARBO01, DISC_03, DISC_06 |
| Pricing MISSING | HART01, OUTS01, DISC_04, DISC_05, majority of DISC_11+ |
""".format(generated=GENERATED_AT, count=len(assignments))

    (CLIENTS_DIR / "SOURCE_COVERAGE.md").write_text(coverage, encoding="utf-8")

    print(f"Generated {len(assignments)} profiles in {CLIENTS_DIR}")
    return len(assignments)


if __name__ == "__main__":
    main()
