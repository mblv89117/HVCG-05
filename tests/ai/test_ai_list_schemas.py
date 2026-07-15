#!/usr/bin/env python3
"""Offline validation for HVCG_AI* SharePoint list schemas (AI Governance)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LISTS = ROOT / "src/sharepoint/lists"

ALLOWED_TYPES = {
    "Text",
    "Note",
    "Number",
    "Boolean",
    "DateTime",
    "Choice",
    "Lookup",
    "Currency",
    "User",
    "URL",
    "Location",
    "Thumbnail",
    "TaxonomyFieldType",
}

# Human-gated / no-auto-send defaults that must hold in v1.x schemas
GOVERNANCE_DEFAULTS = {
    "HVCG_AIJobs": {"AutoApproveAllowed": False},
    "HVCG_AIWorkers": {"ExternalSendBlocked": True},
    "HVCG_AIOutputs": {"ExternalSendBlocked": True, "PublishedOnlyAfterApproval": True},
}


def fail(errors: list[str], msg: str) -> None:
    errors.append(msg)


def main() -> int:
    errors: list[str] = []
    ai_files = sorted(LISTS.glob("HVCG_AI*.json"))
    if len(ai_files) < 19:
        fail(errors, f"Expected >=19 HVCG_AI* list schemas, found {len(ai_files)}")

    index_names: set[str] = set()
    index_path = LISTS / "_index.json"
    if index_path.exists():
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index_names = {item["name"] for item in index.get("lists", [])}

    for path in ai_files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(errors, f"{path.name}: invalid JSON ({exc})")
            continue

        title = data.get("title")
        if not title:
            fail(errors, f"{path.name}: missing title")
            continue
        if not title.startswith("HVCG_AI"):
            fail(errors, f"{path.name}: title must start with HVCG_AI, got {title}")
        if path.stem != title:
            fail(errors, f"{path.name}: filename stem != title ({title})")
        if data.get("template") != "genericList":
            fail(errors, f"{title}: template must be genericList")

        columns = data.get("columns")
        if not isinstance(columns, list) or not columns:
            fail(errors, f"{title}: columns missing or empty")
            continue

        names: set[str] = set()
        by_name: dict[str, dict] = {}
        for col in columns:
            iname = col.get("internalName")
            if not iname:
                fail(errors, f"{title}: column missing internalName")
                continue
            if iname in names:
                fail(errors, f"{title}: duplicate column {iname}")
            names.add(iname)
            by_name[iname] = col
            if not col.get("displayName"):
                fail(errors, f"{title}.{iname}: missing displayName")
            ctype = col.get("type")
            if ctype not in ALLOWED_TYPES:
                fail(errors, f"{title}.{iname}: unknown type {ctype}")
            if ctype == "Choice" and not col.get("choices"):
                fail(errors, f"{title}.{iname}: Choice without choices")
            if ctype == "Lookup":
                target = col.get("lookupList")
                if not target:
                    fail(errors, f"{title}.{iname}: Lookup without lookupList")
                elif index_names and target not in index_names:
                    fail(errors, f"{title}.{iname}: lookupList {target} not in _index.json")

        if "Title" not in names:
            fail(errors, f"{title}: missing Title column")

        for col_name, expected in GOVERNANCE_DEFAULTS.get(title, {}).items():
            if col_name not in by_name:
                fail(errors, f"{title}: missing governance column {col_name}")
            elif by_name[col_name].get("default") is not expected:
                fail(
                    errors,
                    f"{title}.{col_name}: default must be {expected!r}, "
                    f"got {by_name[col_name].get('default')!r}",
                )

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print("PASS")
    print(f" ai_lists={len(ai_files)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
