"""Run one knowledge-operationalization cycle against live Hub / Graph.

Writes SharePoint operating records only when:
- Graph Sites write is actually available, and
- may_write_client(code) is True, and
- an approved ACCG window is set for ACCG01.

Never invents work, deadlines, or financials.
"""

from __future__ import annotations

import json
from typing import Any

from .access import (
    GRAPH_SCOPE,
    acquire_token,
    assess_graph_sites,
    entitlement_codes_from_appsettings,
    hub_get,
    hub_token_from_appsettings,
)
from .ledger import build_report
from .roster import may_write_client


def run_cycle(
    *,
    agent_id: str,
    hub_sha: str,
    approved_accg_window: bool = False,
) -> dict[str, Any]:
    graph_token = acquire_token(GRAPH_SCOPE)
    access = assess_graph_sites(graph_token)
    hub_tok = hub_token_from_appsettings()
    live_codes: list[str] = []
    hub_clients: list[dict[str, Any]] = []
    if hub_tok:
        status, payload = hub_get("/api/pm/clients", hub_tok)
        if status == 200:
            hub_clients = list(payload.get("clients") or [])
            live_codes = [str(c.get("clientCode") or "") for c in hub_clients if c.get("clientCode")]
    map_codes = entitlement_codes_from_appsettings()

    writes: list[str] = []
    skipped: list[str] = []
    for code in live_codes:
        if not may_write_client(code, approved_accg_window=approved_accg_window):
            skipped.append(code)
            continue
        if access.get("command_center_status") != 200:
            skipped.append(code)
            continue
        # Graph write path is reserved for when Sites.Selected is granted.
        # This cycle does not fabricate project/task payloads.
        skipped.append(f"{code}:accessible_but_no_authoritative_work_to_create")

    report = build_report(
        agent_id=agent_id,
        hub_sha=hub_sha,
        hvs_data_access=str(access.get("hvs_data_access") or "BLOCKED"),
        owner_action=str(access.get("owner_action") or ""),
        live_hub_codes=tuple(live_codes),
        extra={
            "entitlement_map_codes": map_codes,
            "hub_client_count": len(hub_clients),
            "writes": writes,
            "skipped": skipped,
            "graph_command_center_status": access.get("command_center_status"),
        },
    )
    can_pass = (
        access.get("hvs_data_access") != "BLOCKED"
        and any(c not in {"SYN01", ""} for c in live_codes)
        and bool(writes)
    )
    return {
        "hvs_data_access": access.get("hvs_data_access"),
        "owner_action": access.get("owner_action"),
        "live_hub_codes": live_codes,
        "entitlement_map_codes": map_codes,
        "writes": writes,
        "skipped": skipped,
        "can_pass": can_pass,
        "report": report,
        "hub_clients_labeled": [
            {
                "clientCode": c.get("clientCode"),
                "displayName": c.get("displayName"),
                "source": c.get("source"),
            }
            for c in hub_clients
        ],
    }


def write_report(path: str, result: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(str(result["report"]))
    sidecar = path.rsplit(".", 1)[0] + ".runtime.json"
    safe = {k: v for k, v in result.items() if k != "report"}
    with open(sidecar, "w", encoding="utf-8") as fh:
        json.dump(safe, fh, indent=2, default=str)
        fh.write("\n")
