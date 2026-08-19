#!/usr/bin/env python3
"""Seed HVCG_AutomationRegistry rows from automation-inventory.json (export for PnP / manual import)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INV = ROOT / "src/power-automate/inventory/automation-inventory.json"
OUT = ROOT / "src/power-automate/inventory/automation-registry-seed.json"


def trigger_summary(trig: dict) -> str:
    if not trig:
        return ""
    t = trig.get("type", "")
    if t == "Recurrence":
        return f"Recurrence: {trig.get('schedule', '')}"
    if "list" in trig:
        cond = trig.get("condition", "")
        return f"{t} on {trig['list']}" + (f" ({cond})" if cond else "")
    return t


def main() -> None:
    inv = json.loads(INV.read_text())
    rows = []
    for a in inv["automations"]:
        rows.append(
            {
                "Title": a["automationName"],
                "FlowName": a["automationName"],
                "Purpose": a.get("purpose"),
                "TriggerSummary": trigger_summary(a.get("trigger") or {}),
                "AutomationStatus": a.get("status") if a.get("status") in ("Off", "On") else "ScaffoldOnly",
                "LastRunAt": a.get("lastRun"),
                "NextRunAt": None,
                "OwnerEmail": a.get("owner"),
                "FailureState": "Unknown",
                "RelatedModule": a.get("relatedModule") or "Platform",
                "LastError": None,
                "DocumentationLink": a.get("documentationLink"),
                "MakerEnvironment": "Development",
                "EnableAuthorized": False,
                "PriorityTheme": a.get("priorityTheme"),
                "HVCG_IdempotencyKey": f"registry|{a['automationName']}",
            }
        )
    payload = {
        "list": "HVCG_AutomationRegistry",
        "sourceInventory": str(INV.relative_to(ROOT)),
        "count": len(rows),
        "items": rows,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {len(rows)} seed rows → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
