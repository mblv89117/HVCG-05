#!/usr/bin/env python3
"""Validate HVCG SharePoint list schemas and project templates."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LISTS = ROOT / "src/sharepoint/lists"
TEMPLATES = ROOT / "templates/projects"
CONFIG = ROOT / "config/hvcg.config.json"
FLOWS = ROOT / "src/power-automate/flows"


def load_json(path: Path):
    with path.open() as f:
        return json.load(f)


def main() -> int:
    errors: list[str] = []

    index = load_json(LISTS / "_index.json")
    list_names = {item["name"] for item in index["lists"]}
    if len(list_names) < 60:
        errors.append(f"Expected >=60 lists, found {len(list_names)}")

    for item in index["lists"]:
        path = ROOT / item["path"]
        if not path.exists():
            errors.append(f"Missing list schema: {path}")
            continue
        data = load_json(path)
        cols = {c["internalName"] for c in data["columns"]}
        if "Title" not in cols:
            errors.append(f"{data['title']}: missing Title")
        for c in data["columns"]:
            if c["type"] == "Lookup":
                target = c.get("lookupList")
                if target not in list_names:
                    errors.append(f"{data['title']}.{c['internalName']}: bad lookup {target}")

    cfg = load_json(CONFIG)
    folders = cfg["documentFolderStructure"]
    if len(folders) != 24:
        errors.append(f"Expected 24 folders, found {len(folders)}")

    tindex = load_json(TEMPLATES / "_index.json")
    if tindex["count"] < 18:
        errors.append(f"Expected >=18 templates, found {tindex['count']}")
    for t in tindex["templates"]:
        td = load_json(ROOT / t["path"])
        if not td.get("tasks"):
            errors.append(f"{t['templateKey']}: no tasks")
        if not td.get("phases"):
            errors.append(f"{t['templateKey']}: no phases")

    findex = load_json(FLOWS / "_index.json")
    if len(findex["flows"]) < 10:
        errors.append(f"Expected >=10 flows, found {len(findex['flows'])}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print("PASS")
    print(f" lists={len(list_names)} templates={tindex['count']} flows={len(findex['flows'])} folders={len(folders)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
