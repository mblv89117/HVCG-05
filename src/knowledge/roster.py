"""Canonical HVCG client roster and classification.

Sources are labeled. Nothing here invents balances, deadlines, lender
criteria, or project health. Entity boundaries are explicit.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

CLASSIFICATIONS = (
    "CONFIRMED",
    "LIKELY",
    "PROPOSED",
    "STALE_OR_UNCERTAIN",
    "COMPLETE",
    "SYNTHETIC_QA",
    "NOT_A_CLIENT",
)

QUEUE_STATES = (
    "Needs Action",
    "Waiting",
    "Overdue",
    "Blocked",
    "Decision Required",
    "At Risk",
    "Ready",
    "Outcomes",
)

ACCG_WRITE_CODES = frozenset({"ACCG01"})
SYNTHETIC_QA_CODES = frozenset({"SYN01"})
STAFF_NOT_CLIENT_CODES = frozenset({"SYN01"})  # Entra staff group reused as a ClientCode in Hub map

# Production Entra HVCG-Client-{Code} groups from Gate 11 / live Hub map.
# Existence of the group is CONFIRMED. SharePoint HVCG_Clients rows are not
# assumed present until a Sites.Selected or Manny-entitled read proves them.
ENTITLED_PRODUCTION_CLIENTS: tuple[dict[str, Any], ...] = (
    {
        "client_code": "HFD01",
        "display_name": "Hart Family Dental",
        "entity_boundary": "Single dental practice client. Do not merge 360 Website Builder Hart tenants as extra HVCG_Clients.",
        "aliases": ("Hart Family Dental", "Hart Dental"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-HFD01 exists. Hub GET /api/pm/clients/HFD01 is 404 to non-Manny callers (fail-closed).",
    },
    {
        "client_code": "CPL01",
        "display_name": "Christie's Place",
        "entity_boundary": "Operating company Christie's Place LLC. Christie Falk and Irwin Falk are people/matters, not extra ClientCodes unless owner confirms.",
        "aliases": ("Christie's Place", "Christies Place", "Christie Falk"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-CPL01 exists. Falk PHL hardship is a related matter — do not auto-merge into CPL01 work.",
    },
    {
        "client_code": "PDG01",
        "display_name": "Prodigy Games",
        "entity_boundary": "Prodigy Games LLC only.",
        "aliases": ("Prodigy Games", "Prodigy Games LLC"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-PDG01 exists.",
    },
    {
        "client_code": "KAVA01",
        "display_name": "That's Kava",
        "entity_boundary": "That's Kava LLC only. Other folders or vendors containing 'kava' are not this client.",
        "aliases": ("That's Kava", "Thats Kava", "That's Kava LLC"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-KAVA01 exists.",
    },
    {
        "client_code": "ACCG01",
        "display_name": "ACCG",
        "entity_boundary": "ACCG Inc. Writes to ACCG01 are frozen until an approved window.",
        "aliases": ("ACCG", "ACCG Inc."),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-ACCG01 exists. ACCG01 write restriction is in force.",
        "write_restricted": True,
    },
    {
        "client_code": "CCB01",
        "display_name": "Colorado Craft Beef",
        "entity_boundary": "Colorado Craft Beef / Colorado Beef SBA Express matter. Not a 360 product tenant.",
        "aliases": ("Colorado Craft Beef", "Colorado Beef"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-CCB01 exists. Do not invent SBA status or balances.",
    },
    {
        "client_code": "LIEN01",
        "display_name": "Lien Partners",
        "entity_boundary": "Lien Partners / Lienpartners. Punctuation variants are the same entity.",
        "aliases": ("Lien Partners", "Lienpartners"),
        "classification": "CONFIRMED",
        "queue": "Blocked",
        "notes": "Entra group HVCG-Client-LIEN01 exists.",
    },
)

NON_CLIENT_OR_BOUNDARY: tuple[dict[str, Any], ...] = (
    {
        "client_code": None,
        "display_name": "SYNTHETIC QA — Atlas Capital Operations",
        "entity_boundary": "Labeled synthetic QA row in live HVCG_Clients (item visible as SYN01). Not a customer.",
        "aliases": ("SYN01",),
        "classification": "SYNTHETIC_QA",
        "queue": "Ready",
        "notes": "Live Hub /api/pm/clients returns only this row to the automation principal. Keep labeled. Do not operationalize as a real client.",
        "live_sharepoint_code": "SYN01",
    },
    {
        "client_code": None,
        "display_name": "Best Day Of My Life",
        "entity_boundary": "Ryan Gnieski consulting website / 360 Website Builder reference tenant. Not standalone software and not an HVCG_Clients code.",
        "aliases": ("Best Day Of My Life", "Gnieski", "Ryan Gnieski"),
        "classification": "STALE_OR_UNCERTAIN",
        "queue": "Decision Required",
        "notes": "Bootstrap historically treated 'Gnieski Engagement' as HVS client work. Owner instruction: reference tenant under 360 Website Builder. Conflict surfaced; do not create BDOM01.",
        "conflicts": ("bootstrap_hvs_engagement", "360_website_builder_reference_tenant"),
    },
    {
        "client_code": None,
        "display_name": "Loanspark",
        "entity_boundary": "Vendor / referral unless current evidence changes.",
        "aliases": ("Loanspark", "LoanSpark"),
        "classification": "NOT_A_CLIENT",
        "queue": "Ready",
        "notes": "No HVCG-Client-* group. Do not create LOAN01. Bootstrap 'LoanSpark Engagement' is stale unless owner reclassifies.",
    },
    {
        "client_code": None,
        "display_name": "Falk PHL hardship / cash surrender",
        "entity_boundary": "Related-person matter for Christie/Irwin Falk. Not automatically CPL01 and not a new ClientCode.",
        "aliases": ("Falk", "Irwin Falk", "Falk PHL"),
        "classification": "PROPOSED",
        "queue": "Decision Required",
        "notes": "Keep associated to CPL01 as a matter/contact until owner confirms a separate client record.",
        "conflicts": ("christie_place_entity_boundary",),
    },
)


@dataclass(frozen=True)
class RosterRow:
    source: str
    client: str
    client_code: str | None
    data_type: str
    discovered: str
    accessible: str
    indexed: str
    classified: str
    operationalized: str
    validated: str
    exceptions: str
    blocker: str
    write_allowed: bool

    def as_ledger_dict(self) -> dict[str, Any]:
        return asdict(self)


def may_write_client(client_code: str | None, *, approved_accg_window: bool = False) -> bool:
    if not client_code:
        return False
    code = client_code.strip().upper()
    if code in SYNTHETIC_QA_CODES or code in STAFF_NOT_CLIENT_CODES:
        return False
    if code in ACCG_WRITE_CODES and not approved_accg_window:
        return False
    if not code.isascii() or not code.isalnum() or len(code) < 3:
        return False
    return True


def classify_entity(name: str) -> dict[str, Any]:
    hay = (name or "").strip().lower()
    if not hay:
        return {"classification": "STALE_OR_UNCERTAIN", "client_code": None, "reason": "empty"}
    if "synthetic" in hay or hay in {"syn01", "synthetic qa"}:
        return {"classification": "SYNTHETIC_QA", "client_code": "SYN01", "reason": "labeled_synthetic_qa"}
    if "loanspark" in hay:
        return {"classification": "NOT_A_CLIENT", "client_code": None, "reason": "vendor_referral"}
    if "best day" in hay or "gnieski" in hay:
        return {
            "classification": "STALE_OR_UNCERTAIN",
            "client_code": None,
            "reason": "360_website_builder_reference_tenant",
        }
    for row in ENTITLED_PRODUCTION_CLIENTS:
        aliases = [row["display_name"].lower(), *(a.lower() for a in row["aliases"])]
        if hay == row["client_code"].lower() or any(a in hay or hay in a for a in aliases):
            return {
                "classification": row["classification"],
                "client_code": row["client_code"],
                "reason": "entitled_production_group",
                "write_restricted": bool(row.get("write_restricted")),
            }
    if hay in {"falk", "irwin falk", "christie falk"}:
        return {"classification": "PROPOSED", "client_code": None, "reason": "person_or_matter_not_client"}
    return {"classification": "STALE_OR_UNCERTAIN", "client_code": None, "reason": "unmapped"}


def build_canonical_roster(*, live_hub_codes: tuple[str, ...] = ()) -> list[RosterRow]:
    rows: list[RosterRow] = []
    live = {c.upper() for c in live_hub_codes}

    for item in ENTITLED_PRODUCTION_CLIENTS:
        code = item["client_code"]
        write_ok = may_write_client(code)
        in_hub = code in live
        rows.append(
            RosterRow(
                source="Entra HVCG-Client-* + live Hub entitlement map",
                client=item["display_name"],
                client_code=code,
                data_type="Client master / entitlement",
                discovered="YES",
                accessible="NO" if not in_hub else "YES",
                indexed="NO",
                classified=item["classification"],
                operationalized="NO",
                validated="PARTIAL" if not in_hub else "YES",
                exceptions=item["notes"],
                blocker=(
                    "ACCG01 write freeze"
                    if code in ACCG_WRITE_CODES
                    else "Hub entitlement fail-closed (non-Manny) and Graph Sites.Selected missing"
                ),
                write_allowed=write_ok and in_hub,
            )
        )

    rows.append(
        RosterRow(
            source="Live Hub GET /api/pm/clients",
            client="SYNTHETIC QA — Atlas Capital Operations",
            client_code="SYN01",
            data_type="Labeled synthetic QA SharePoint row",
            discovered="YES",
            accessible="YES",
            indexed="YES",
            classified="SYNTHETIC_QA",
            operationalized="NO",
            validated="YES",
            exceptions="Visible to automation principal. Not a customer. Do not invent real work.",
            blocker="",
            write_allowed=False,
        )
    )

    for item in NON_CLIENT_OR_BOUNDARY:
        if item.get("live_sharepoint_code") == "SYN01":
            continue
        rows.append(
            RosterRow(
                source="Owner instruction + Hub bootstrap heuristics",
                client=item["display_name"],
                client_code=item.get("client_code"),
                data_type="Boundary / non-client",
                discovered="YES",
                accessible="NO",
                indexed="NO",
                classified=item["classification"],
                operationalized="NO",
                validated="PARTIAL",
                exceptions=item["notes"],
                blocker="Do not create a ClientCode without owner confirmation",
                write_allowed=False,
            )
        )

    rows.append(
        RosterRow(
            source="HVS SharePoint / OneDrive / historical repositories",
            client="HVS historical materials",
            client_code=None,
            data_type="Historical HVS documents",
            discovered="UNPROVEN",
            accessible="NO",
            indexed="NO",
            classified="STALE_OR_UNCERTAIN",
            operationalized="NO",
            validated="NO",
            exceptions="HVS_DATA_ACCESS=BLOCKED. No Sites.Selected on HVS tenant; Hub has no HVS site IDs.",
            blocker="Least-privileged: Sites.Selected Read on HVS libraries or Hub delegated HVS connector",
            write_allowed=False,
        )
    )
    return rows
