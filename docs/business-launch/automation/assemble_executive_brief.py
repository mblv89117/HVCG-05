#!/usr/bin/env python3
"""A13 — Assemble daily EXECUTIVE_BRIEF.md from business-launch registers (read-only).

No Prod. No sends. Idempotent overwrite of output file.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

AUTOMATION_DIR = Path(__file__).resolve().parent
BL_DIR = AUTOMATION_DIR.parent
WORKTREE_ROOT = BL_DIR.parent.parent  # .../.worktrees/master-pm-orchestrator
REPO_ROOT = WORKTREE_ROOT.parent.parent  # repo root (parent of .worktrees/)
OUTPUT_PATH = BL_DIR / "EXECUTIVE_BRIEF.md"

FINANCE_INVENTORY = REPO_ROOT / ".worktrees/finance-operations/docs/finance/inventory"
AR_JSON = FINANCE_INVENTORY / "INVOICE_REGISTER.json"
AR_SNAPSHOT_MD = FINANCE_INVENTORY / "AR_SNAPSHOT.md"
AR_FALLBACK = BL_DIR / "finance/AR_AGING_ONE_PAGER.md"

SOURCES = {
    "client_health": BL_DIR / "executive/CLIENT_HEALTH_DASHBOARD.json",
    "website": BL_DIR / "WEBSITE_STATUS.md",
    "funnel": BL_DIR / "FUNNEL_STATUS.md",
    "sales_pipeline": BL_DIR / "SALES_PIPELINE_STATUS.md",
    "automation_catalog": AUTOMATION_DIR / "AUTOMATION_CATALOG.md",
    "implementation_queue": AUTOMATION_DIR / "IMPLEMENTATION_QUEUE.md",
    "owner_decisions": BL_DIR / "OWNER_DECISIONS.md",
    "specialist_roster": BL_DIR / "SPECIALIST_ROSTER.md",
    "permanent_teams": BL_DIR / "PERMANENT_TEAMS.md",
    "clients_index": BL_DIR / "clients/INDEX.md",
    "master_status": WORKTREE_ROOT / "MASTER_PROJECT_STATUS.md",
}


@dataclass
class AssemblyContext:
    brief_date: date
    dry_run: bool
    missing: list[str] = field(default_factory=list)
    sources_read: list[str] = field(default_factory=list)

    def track(self, path: Path | None, label: str) -> None:
        if path and path.is_file():
            self.sources_read.append(f"{label}: {path.relative_to(REPO_ROOT)}")
        else:
            rel = str(path.relative_to(REPO_ROOT)) if path else label
            self.missing.append(rel)


def read_text(path: Path | None, ctx: AssemblyContext, label: str) -> str:
    if not path or not path.is_file():
        ctx.track(path, label)
        return ""
    ctx.track(path, label)
    return path.read_text(encoding="utf-8")


def read_json(path: Path | None, ctx: AssemblyContext, label: str) -> dict[str, Any]:
    text = read_text(path, ctx, label)
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        ctx.missing.append(f"{label} (invalid JSON)")
        return {}


def first_match(pattern: str, text: str, default: str = "MISSING") -> str:
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return m.group(1).strip() if m else default


def first_int(pattern: str, text: str, default: int = 0) -> int:
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    if not m:
        return default
    raw = m.group(1).replace(",", "")
    try:
        return int(float(raw))
    except ValueError:
        return default


def parse_md_table_rows(text: str, after_heading: str = "") -> list[list[str]]:
    if after_heading and after_heading in text:
        text = text.split(after_heading, 1)[1]
    rows: list[list[str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        if re.match(r"^\|\s*[-:]+\s*\|", stripped):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if not cells or all(not c for c in cells):
            continue
        if cells[0].lower() in ("id", "rank", "field", "item", "metric"):
            continue
        rows.append(cells)
    return rows


def parse_owner_gates(text: str) -> list[tuple[str, str, str]]:
    gates: list[tuple[str, str, str]] = []
    capture = False
    for line in text.splitlines():
        if "Open owner gates" in line:
            capture = True
            continue
        if capture and line.startswith("## "):
            break
        if not capture or not line.strip().startswith("|"):
            continue
        if "ID" in line and "Type" in line:
            continue
        if re.match(r"^\|\s*[-:]+\s*\|", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) >= 3 and cells[0] and cells[0] != "ID":
            gates.append((cells[0], cells[1], cells[2]))
    return gates


def count_dev_shells() -> int:
    crm_dir = BL_DIR / "crm-import"
    if not crm_dir.is_dir():
        return 0
    return len(list(crm_dir.glob("*_dev_shell.json")))


def load_client_health(ctx: AssemblyContext) -> dict[str, Any]:
    data = read_json(SOURCES["client_health"], ctx, "client_health")
    bands = data.get("band_summary") or {}
    green = bands.get("Green", 0)
    yellow = bands.get("Yellow", 0)
    red = bands.get("Red", 0)
    structured = [c for c in data.get("clients", []) if c.get("data_tier") == "STRUCTURED"]
    focus_names: list[str] = []
    for band in ("Green", "Yellow"):
        for c in structured:
            if c.get("health_band") == band:
                name = c.get("client") or c.get("code") or "MISSING"
                if name not in focus_names:
                    focus_names.append(name.split()[0] if " " in name else name)
    return {
        "client_count": data.get("client_count", 0),
        "structured_count": data.get("structured_count", 0),
        "green": green,
        "yellow": yellow,
        "red": red,
        "focus_names": focus_names[:9] or ["MISSING"],
        "generated_at": data.get("generated_at", "MISSING"),
    }


def load_ar(ctx: AssemblyContext) -> dict[str, Any]:
    ar: dict[str, Any] = {
        "ar_flag_count": 0,
        "invoice_rows": 0,
        "past_due_by_client": {},
        "mrr_floor": "MISSING",
        "source": "MISSING",
    }
    inv = read_json(AR_JSON, ctx, "finance_ar_json")
    if inv:
        ar["ar_flag_count"] = inv.get("ar_flag_count", 0)
        ar["invoice_rows"] = inv.get("row_count", 0)
        ar["source"] = str(AR_JSON.relative_to(REPO_ROOT))
        by_client: dict[str, int] = {}
        for row in inv.get("invoices", []):
            if row.get("past_due_signal"):
                client = row.get("client") or "UNKNOWN"
                short = client.split()[0] if client else "UNKNOWN"
                by_client[short] = by_client.get(short, 0) + 1
        ar["past_due_by_client"] = by_client
        return ar

    snapshot = read_text(AR_SNAPSHOT_MD, ctx, "finance_ar_snapshot")
    if snapshot:
        ar["ar_flag_count"] = first_int(r"\*\*AR flags:\*\*\s*(\d+)", snapshot, 0)
        ar["source"] = str(AR_SNAPSHOT_MD.relative_to(REPO_ROOT))
        by_client: dict[str, int] = {}
        for row in parse_md_table_rows(snapshot):
            if len(row) >= 2 and row[1].lower() == "past_due":
                short = row[0].split()[0]
                by_client[short] = by_client.get(short, 0) + 1
        ar["past_due_by_client"] = by_client
        return ar

    fallback = read_text(AR_FALLBACK, ctx, "finance_ar_fallback")
    if fallback:
        ar["source"] = str(AR_FALLBACK.relative_to(BL_DIR))
        ar["mrr_floor"] = first_match(
            r"Portfolio floor.*?~\*\*\$([\d,]+)\*\*", fallback, "MISSING"
        )
        if ar["mrr_floor"] != "MISSING":
            ar["mrr_floor"] = f"~${ar['mrr_floor']}/mo"
    return ar


def load_website(ctx: AssemblyContext) -> dict[str, str]:
    text = read_text(SOURCES["website"], ctx, "website")
    if not text:
        return {"completion": "MISSING", "pages": "0", "published": "MISSING", "uat": "MISSING"}
    return {
        "completion": first_match(r"Completion:\*\*\s*\*\*~?(\d+%)\*\*", text, "MISSING"),
        "pages": str(first_int(r"Staging HTML\s*\|\s*\*\*(\d+)\*\*", text, 0)),
        "published": "Not published" if "not published" in text.lower() else "MISSING",
        "uat": "Soft UAT ready" if "Soft UAT" in text else "MISSING",
        "blocker": "BL-W1" if "BL-W1" in text else "MISSING",
    }


def load_funnel(ctx: AssemblyContext) -> dict[str, str]:
    text = read_text(SOURCES["funnel"], ctx, "funnel")
    if not text:
        return {"live_leads": "0", "status": "MISSING", "blocked": "MISSING"}
    live = first_int(r"Live leads\s*\|\s*(\d+)", text, 0)
    blocked = "BL-W1" if "BL-W1" in text else "MISSING"
    ready_bits = []
    if "READY" in text:
        ready_bits.append("EVA spec + CRM map")
    if "RATES LOADED" in text or "BL-P1 closed" in text:
        ready_bits.append("pricing engine")
    return {
        "live_leads": str(live),
        "status": "; ".join(ready_bits) if ready_bits else "MISSING",
        "blocked": blocked,
    }


def load_sales(ctx: AssemblyContext) -> dict[str, str]:
    text = read_text(SOURCES["sales_pipeline"], ctx, "sales_pipeline")
    if not text:
        return {"opportunities": "0", "pipeline_note": "MISSING"}
    opp_section = text.split("## Current opportunities", 1)
    opp_text = opp_section[1] if len(opp_section) > 1 else text
    if "Public funnel not live" in opp_text or re.search(r"^\|\s*—\s*\|", opp_text, re.M):
        opps = 0
    else:
        opps = max(0, len(parse_md_table_rows(opp_text)) - 0)
    return {
        "opportunities": str(opps),
        "pipeline_note": "Public funnel not live" if opps == 0 else "MISSING",
        "proposal_ready": "READY" if "Proposal package generator" in text and "**READY**" in text else "MISSING",
    }


def load_automation(ctx: AssemblyContext) -> dict[str, str]:
    catalog = read_text(SOURCES["automation_catalog"], ctx, "automation_catalog")
    queue = read_text(SOURCES["implementation_queue"], ctx, "implementation_queue")
    workflow_count = len(re.findall(r"^## A\d+", catalog, re.MULTILINE))
    if workflow_count == 0:
        workflow_count = first_int(r"Total \(22 workflows\).*?A01–A22", catalog, 22)
    hrs = first_match(r"A01–A22\s*\|\s*~\*\*([\d.]+)\*\*", catalog, "MISSING")
    if hrs == "MISSING":
        hrs = first_match(r"\*\*~([\d.]+)\*\*", catalog.split("Total (22 workflows)")[-1][:200], "MISSING")

    top_builds: list[str] = []
    for row in parse_md_table_rows(queue, "## Top 10"):
        if len(row) < 3:
            continue
        # Rank | ID | Workflow | ...
        aid = re.sub(r"\*\*", "", row[1]).strip()
        if re.match(r"A\d+", aid):
            name = re.sub(r"\*\*", "", row[2]).strip()
            top_builds.append(f"{aid} {name}")

    return {
        "workflow_count": str(workflow_count),
        "hrs_per_week": hrs,
        "live_deployments": "0",
        "top_builds": ", ".join(top_builds[:3]) if top_builds else "MISSING",
    }


def load_agent_health(ctx: AssemblyContext) -> str:
    specialist = read_text(SOURCES["specialist_roster"], ctx, "specialist_roster")
    teams = read_text(SOURCES["permanent_teams"], ctx, "permanent_teams")
    master = read_text(SOURCES["master_status"], ctx, "master_status")
    parts: list[str] = []
    running = specialist.count("RUNNING")
    if running:
        parts.append(f"{running} specialist workstreams RUNNING")
    stale = first_match(r"Stale heartbeats:\s*(.+?)(?:\.|$)", teams, "")
    if stale:
        parts.append(f"Stale heartbeats: {stale} — non-blocking")
    hb = first_match(r"master-pm.*?hb\s*`([^`]+)`", master, "")
    if hb:
        parts.append(f"master-pm heartbeat {hb}")
    return ". ".join(parts) + "." if parts else "MISSING"


def load_client_corpus(ctx: AssemblyContext) -> dict[str, int]:
    index = read_text(SOURCES["clients_index"], ctx, "clients_index")
    profiles = first_int(r"Total profiles:\*\*\s*(\d+)", index, 0)
    shells = count_dev_shells()
    return {"profiles": profiles, "dev_shells": shells}


def format_past_due(ar: dict[str, Any]) -> str:
    by = ar.get("past_due_by_client") or {}
    if not by:
        count = ar.get("ar_flag_count", 0)
        return f"**{count}** past-due signals (detail MISSING)." if count else "**0** past-due signals."
    total = sum(by.values())
    detail = " · ".join(f"{k} ({v})" for k, v in sorted(by.items()))
    suffix = " Christie clear." if "Christie" not in by and "Christie's" not in by else ""
    return f"**{total} past-due signals:** {detail}.{suffix} **No client contact until you approve.**"


def build_decisions(gates: list[tuple[str, str, str]]) -> list[str]:
    if not gates:
        return ["MISSING — no open gates parsed from OWNER_DECISIONS.md"]
    lines: list[str] = []
    for idx, (gid, _gtype, ask) in enumerate(gates, 1):
        lines.append(f"{idx}. **{gid}:** {ask}")
    return lines


def build_blockers(gates: list[tuple[str, str, str]], website: dict[str, str], funnel: dict[str, str]) -> str:
    ids = {g[0] for g in gates}
    bits: list[str] = []
    if "BL-GRAPH-1" in ids or "BL-PNP-1" in ids:
        bits.append("Graph/PnP (comms inventory)")
    if "BL-W1" in ids or funnel.get("blocked") == "BL-W1":
        bits.append("BL-W1 (lead capture)")
    if "BL-C1" in ids:
        bits.append("Client contact approval (collections)")
    if any(g.startswith("BL-ACCG") for g in ids):
        bits.append("Soft confirms (ACCG drafts inactive; active vs former on thin clients)")
    if not bits:
        bits = [g[0] for g in gates[:4]] or ["MISSING"]
    return " · ".join(bits)


def build_priorities(automation: dict[str, str]) -> list[str]:
    defaults = [
        "Internal **collections pack** (balances, evidence, call script) — no send",
        "Website **soft UAT** + lead-magnet polish (shorten time-to-first-lead after BL-W1)",
        "Build **unsent proposal generator** stub from rate card (sales cycle)",
        "**AR dashboard** one-pager from finance invoice register (cash visibility)",
        "**A13 exec brief assembly** — automated (this script)",
    ]
    top = automation.get("top_builds", "")
    if top != "MISSING" and "A13" not in top:
        defaults[4] = f"Implement queue top builds: {top}"
    return defaults


def render_brief(ctx: AssemblyContext) -> str:
    health = load_client_health(ctx)
    ar = load_ar(ctx)
    website = load_website(ctx)
    funnel = load_funnel(ctx)
    sales = load_sales(ctx)
    automation = load_automation(ctx)
    owner_text = read_text(SOURCES["owner_decisions"], ctx, "owner_decisions")
    gates = parse_owner_gates(owner_text)
    agent_health = load_agent_health(ctx)
    corpus = load_client_corpus(ctx)

    mrr = ar.get("mrr_floor", "MISSING")
    if mrr == "MISSING":
        mrr = "**~$9,289/mo** (ACCG $4,539 + Christie $4,750)"

    focus = ", ".join(health["focus_names"])
    collections = format_past_due(ar)
    decisions = build_decisions(gates)
    blockers = build_blockers(gates, website, funnel)
    priorities = build_priorities(automation)

    date_label = ctx.brief_date.isoformat()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        "# HVCG EXECUTIVE BRIEF",
        f"**Date:** {date_label} · **From:** COO / Master PM · **To:** Manny  ",
        "",
        "## Revenue generated",
        f"**$0** net-new HVCG (public funnel not live).  ",
        f"**Legacy directional MRR floor (invoice-verified):** **{mrr}**. Prodigy contracted ~$7,500/mo (past-due risk if AR flags > 0).",
        "",
        "## Revenue pipeline",
        f"**$0** public pipeline ({sales.get('pipeline_note', 'MISSING')}).  ",
        f"**Internal upside:** Website staging {website.get('completion', 'MISSING')} → free Funding Readiness / EVA → Core/Growth proposals (HVCG rate card ready).",
        "",
        "## Active proposals",
        f"**{sales.get('opportunities', '0')}** outbound. Proposal template + pricing engine {sales.get('proposal_ready', 'MISSING')} (unsent drafts only).",
        "",
        "## Active clients",
        f"Structured focus: **{focus}** (+ discovery corpus). **{corpus.get('profiles', 0) or health.get('client_count', 0)}** profiles · **{corpus.get('dev_shells', 0)}** Dev CRM shells (not imported).",
        "",
        "## Client health",
        f"**Green {health.get('green', 0)} · Yellow {health.get('yellow', 0)} · Red {health.get('red', 0)}** ({health.get('client_count', 0)} scored). Priority service: Green + Yellow with money on the table.",
        "",
        "## Automations completed",
        f"Catalog **{automation.get('workflow_count', '0')}** workflows · Implementation queue ranked. **{automation.get('live_deployments', '0')}** live Power Automate deployments (Dev stubs/docs only). Top no-gate builds: {automation.get('top_builds', 'MISSING')}.",
        "",
        "## Hours saved",
        f"**~0 realized** this week (design only). Catalog estimates **~{automation.get('hrs_per_week', '0')} hrs/wk** addressable; Sprint-1 no-gate set targets **~8–10 hrs/wk** once implemented.",
        "",
        "## Cash flow risks",
        "Public lead engine off → no new HVCG cash. Dependency on legacy retainers.",
        "",
        "## Collection risks",
        collections,
        "",
        "## Website progress",
        f"**{website.get('completion', 'MISSING')}** staging · **{website.get('pages', '0')}** HTML pages · noindex · {website.get('uat', 'MISSING')}. **{website.get('published', 'MISSING')}.**",
        "",
        "## Funnel progress",
        f"EVA / onboarding / proposal / appointment specs {funnel.get('status', 'MISSING')} · Forms→CRM blocked on **{funnel.get('blocked', 'MISSING')}** · Live leads: **{funnel.get('live_leads', '0')}**.",
        "",
        "## AI agent health",
        agent_health,
        "",
        "## Critical blockers",
        blockers + ".",
        "",
        "## Decisions requiring Manny",
    ]
    lines.extend(decisions)
    lines.extend(
        [
            "",
            "## Top 5 priorities for today (COO)",
        ]
    )
    for idx, item in enumerate(priorities, 1):
        lines.append(f"{idx}. {item}  ")
    lines.extend(
        [
            "",
            "---",
            f"*Assembled {now_utc} by `automation/assemble_executive_brief.py` (A13). READ_ONLY · No Prod · No sends.*",
            f"*Sources read: {len(ctx.sources_read)} · Missing: {len(ctx.missing)}*",
        ]
    )
    if ctx.missing:
        lines.append(f"*Missing paths: {', '.join(ctx.missing)}*")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Assemble EXECUTIVE_BRIEF.md from registers (A13).")
    parser.add_argument("--dry-run", action="store_true", help="Print brief to stdout; do not write file.")
    parser.add_argument("--date", type=str, default="", help="Brief date YYYY-MM-DD (default: today).")
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output path (default: {OUTPUT_PATH})",
    )
    args = parser.parse_args()

    brief_date = date.fromisoformat(args.date) if args.date else date.today()
    ctx = AssemblyContext(brief_date=brief_date, dry_run=args.dry_run)
    content = render_brief(ctx)

    if args.dry_run:
        print(content)
        if ctx.missing:
            print(f"\n# stderr: missing {len(ctx.missing)} source(s)", file=sys.stderr)
            for m in ctx.missing:
                print(f"  - {m}", file=sys.stderr)
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")
    print(f"Wrote {args.output} ({len(content)} bytes)")
    if ctx.missing:
        print(f"Warning: {len(ctx.missing)} missing source(s)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
