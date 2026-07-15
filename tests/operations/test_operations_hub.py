#!/usr/bin/env python3
"""Operations Hub — exclusive-path offline packaging validation.

Validates docs/operations, HVCG_Ops* flows/definitions, and operations-hub-views.json.
Does NOT require or mutate locked shared indexes.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []

OPS_FLOWS = [
    "HVCG_OpsApprovalRouter",
    "HVCG_OpsExpenseApproval",
    "HVCG_OpsPolicyReviewReminders",
    "HVCG_OpsRenewalAlerts",
    "HVCG_OpsWeeklyDigest",
]

LOCKED_SHARED = [
    "src/power-automate/flows/_index.json",
    "src/power-automate/definitions/_index.json",
    "src/sharepoint/lists/_index.json",
    "src/sharepoint/views/command-center-views.json",
]


def fail(msg: str) -> None:
    errors.append(msg)


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    # --- Docs package ---
    required_docs = [
        "docs/operations/ARCHITECTURE.md",
        "docs/operations/HANDOFF.md",
        "docs/operations/SHARED_FILE_RECOMMENDATIONS.md",
    ]
    for rel in required_docs:
        p = ROOT / rel
        if not p.exists():
            fail(f"Missing {rel}")
        elif p.stat().st_size < 200:
            fail(f"Too short: {rel}")

    shared_doc = ROOT / "docs/operations/SHARED_FILE_RECOMMENDATIONS.md"
    if shared_doc.exists():
        text = shared_doc.read_text(encoding="utf-8")
        for token in [
            "parent",
            "operations-hub-views.json",
            "HVCG_Ops",
            "_index.json",
            "command-center-views.json",
        ]:
            if token not in text:
                fail(f"SHARED_FILE_RECOMMENDATIONS.md missing token: {token}")

    arch = ROOT / "docs/operations/ARCHITECTURE.md"
    if arch.exists():
        atext = arch.read_text(encoding="utf-8")
        for token in ["Operations Hub", "exclusive", "HVCG_Ops", "operations-hub-views.json"]:
            if token not in atext and token.lower() not in atext.lower():
                fail(f"ARCHITECTURE.md missing token: {token}")

    # --- Ops flows + definitions ---
    for name in OPS_FLOWS:
        flow_path = ROOT / f"src/power-automate/flows/{name}.json"
        defn_path = ROOT / f"src/power-automate/definitions/{name}.definition.json"
        if not flow_path.exists():
            fail(f"Missing flow {flow_path.relative_to(ROOT)}")
            continue
        if not defn_path.exists():
            fail(f"Missing definition {defn_path.relative_to(ROOT)}")
            continue

        try:
            flow = load(flow_path)
        except json.JSONDecodeError as exc:
            fail(f"Invalid JSON flow {name}: {exc}")
            continue
        try:
            defn = load(defn_path)
        except json.JSONDecodeError as exc:
            fail(f"Invalid JSON definition {name}: {exc}")
            continue

        if flow.get("flowName") != name:
            fail(f"{name} flowName={flow.get('flowName')}")
        if defn.get("name") != name:
            fail(f"{name} definition name={defn.get('name')}")
        if flow.get("defaultState") != "Off":
            fail(f"{name} flow defaultState must be Off (got {flow.get('defaultState')})")
        if defn.get("defaultState") != "Off":
            fail(f"{name} definition defaultState must be Off (got {defn.get('defaultState')})")
        module = str(flow.get("module", ""))
        if "Operations" not in module and "Ops" not in module:
            fail(f"{name} unexpected module={module}")
        if not flow.get("steps"):
            fail(f"{name} missing steps")
        if not flow.get("trigger"):
            fail(f"{name} missing trigger")
        if "definition" not in defn:
            fail(f"{name} definition missing definition body")

    # --- Exclusive views package ---
    views_path = ROOT / "src/sharepoint/views/operations-hub-views.json"
    if not views_path.exists():
        fail("Missing operations-hub-views.json")
        views_pkg = {"views": []}
    else:
        try:
            views_pkg = load(views_path)
        except json.JSONDecodeError as exc:
            fail(f"Invalid JSON operations-hub-views.json: {exc}")
            views_pkg = {"views": []}

    mod = str(views_pkg.get("module", ""))
    if "Operations" not in mod and "Ops" not in mod:
        fail(f"operations-hub-views.json unexpected module={views_pkg.get('module')}")
    views = views_pkg.get("views", [])
    if len(views) < 10:
        fail(f"Expected >=10 ops views, got {len(views)}")

    seen_titles: set[tuple[str, str]] = set()
    for v in views:
        lst = v.get("list")
        title = v.get("title")
        fields = v.get("fields") or []
        if not lst or not title:
            fail(f"View missing list/title: {v}")
            continue
        key = (lst, title)
        if key in seen_titles:
            fail(f"Duplicate view {lst}/{title}")
        seen_titles.add(key)
        if not fields:
            fail(f"View {lst}/{title} has no fields")

        schema_path = ROOT / "src/sharepoint/lists" / f"{lst}.json"
        if not schema_path.exists():
            fail(f"View list schema missing: {lst}.json")
            continue
        try:
            schema = load(schema_path)
        except json.JSONDecodeError as exc:
            fail(f"Invalid list schema {lst}: {exc}")
            continue
        cols = {
            c.get("internalName") or c.get("name")
            for c in schema.get("columns", [])
            if isinstance(c, dict)
        } | {"Title"}
        for field in fields:
            if field not in cols:
                fail(f"View {lst}/{title} unknown field {field}")

    # --- Isolation: exclusive package must exist without requiring shared edits ---
    # Read locked files if present (existence only) — never require mutating them.
    for rel in LOCKED_SHARED:
        p = ROOT / rel
        if not p.exists():
            # Not a failure for exclusive package, but note nothing to wrong
            continue
        # Sanity: file remains valid JSON; we do not assert Ops registration.
        try:
            load(p)
        except json.JSONDecodeError as exc:
            fail(f"Locked shared file invalid JSON (do not repair from Ops): {rel}: {exc}")

    # Screen stubs optional but preferred
    for rel in [
        "src/power-apps/screens/scrOpsHub.md",
        "src/power-apps/screens/scrHomeOps.md",
    ]:
        if not (ROOT / rel).exists():
            fail(f"Missing screen stub {rel}")

    if errors:
        print("FAIL operations hub module checks")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS operations hub module checks")
    print(f"  docs: {len(required_docs)}")
    print(f"  flows: {len(OPS_FLOWS)}")
    print(f"  views: {len(views)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
