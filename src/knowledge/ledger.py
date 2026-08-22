"""Render the recovery / operationalization ledger."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .roster import RosterRow, build_canonical_roster

LEDGER_COLUMNS = (
    "SOURCE",
    "CLIENT",
    "CLIENTCODE",
    "DATA TYPE",
    "DISCOVERED",
    "ACCESSIBLE",
    "INDEXED",
    "CLASSIFIED",
    "OPERATIONALIZED",
    "VALIDATED",
    "EXCEPTIONS",
    "BLOCKER",
)


def rows_to_markdown(rows: list[RosterRow]) -> str:
    header = "| " + " | ".join(LEDGER_COLUMNS) + " |"
    sep = "| " + " | ".join("---" for _ in LEDGER_COLUMNS) + " |"
    lines = [header, sep]
    for r in rows:
        cells = [
            r.source,
            r.client,
            r.client_code or "",
            r.data_type,
            r.discovered,
            r.accessible,
            r.indexed,
            r.classified,
            r.operationalized,
            r.validated,
            r.exceptions.replace("|", "/"),
            r.blocker.replace("|", "/"),
        ]
        lines.append("| " + " | ".join(cells) + " |")
    return "\n".join(lines)


def build_report(
    *,
    agent_id: str,
    hub_sha: str,
    hvs_data_access: str,
    owner_action: str,
    live_hub_codes: tuple[str, ...] = (),
    extra: dict[str, Any] | None = None,
) -> str:
    rows = build_canonical_roster(live_hub_codes=live_hub_codes)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    real_confirmed = [r for r in rows if r.classified == "CONFIRMED"]
    operationalized = [r for r in rows if r.operationalized == "YES"]
    can_pass = hvs_data_access != "BLOCKED" and any(r.accessible == "YES" and r.classified == "CONFIRMED" for r in rows)
    extra = extra or {}
    return f"""# Client knowledge operationalization ledger

Generated: {now}
Durable Agent ID: `{agent_id}`
Live Hub SHA: `{hub_sha}`
HVS_DATA_ACCESS: **{hvs_data_access}**
CLIENT_KNOWLEDGE_OPERATIONALIZATION: **{'PASS' if can_pass else 'FAIL'}**

## Honesty

- SharePoint / OneDrive remain the governed source repositories. Atlas holds metadata, source refs, relationships, summaries, and exception-driven operating records.
- SYN01 in live `HVCG_Clients` is labeled **SYNTHETIC QA** and is not a customer.
- ACCG01 writes are frozen until an approved window.
- No balances, deadlines, lender criteria, or project health were invented this cycle.

## Least-privileged owner action

{owner_action}

Do **not** add this automation principal to `HVCG-Client-*` groups (G11-F03 Manny-only).
Do **not** download/re-upload HVS files if Sites.Selected or Hub delegated HVS access can be granted.

## Ledger

{rows_to_markdown(rows)}

## Counts

- CONFIRMED production clients (entitlement groups): {len(real_confirmed)}
- Operationalized this cycle: {len(operationalized)}
- Live Hub codes visible to this principal: {', '.join(live_hub_codes) or '(none beyond fail-closed)'}

## Extra runtime notes

```
{extra}
```
"""
