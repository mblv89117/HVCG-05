#!/usr/bin/env python3
"""Weekly AR refresh — Finance division. Read-only sources → AR_DASHBOARD.md update pointer."""
from pathlib import Path
from datetime import datetime, timezone
import json

ROOT = Path(__file__).resolve().parents[1]
FIN_INV = Path("/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/finance-operations/docs/finance/inventory/INVOICE_REGISTER.json")
OUT = ROOT / "AR_DASHBOARD_REFRESH.json"

def main():
    rows = []
    if FIN_INV.exists():
        data = json.loads(FIN_INV.read_text())
        rows = data if isinstance(data, list) else data.get("rows") or data.get("invoices") or data.get("records") or []
        if isinstance(data, dict) and not rows:
            for v in data.values():
                if isinstance(v, list):
                    rows = v
                    break
    payload = {
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "invoice_rows": len(rows),
        "approval_queue": "APPROVAL_QUEUE.md",
        "dashboard": "AR_DASHBOARD.md",
        "auto_contact": False,
        "next_task": "Age each past-due flag into 1-30/31-60/61+ when dates parseable",
    }
    OUT.write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload))

if __name__ == "__main__":
    main()
