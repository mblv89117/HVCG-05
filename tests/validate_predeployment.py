#!/usr/bin/env python3
"""
HVCG pre-deployment validation.
Critical failures exit 1. Warnings print but do not fail unless --strict.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LISTS = ROOT / "src/sharepoint/lists"
TEMPLATES = ROOT / "templates/projects"
FLOWS = ROOT / "src/power-automate/flows"
CONFIG = ROOT / "config/hvcg.config.json"
VIEWS = ROOT / "src/sharepoint/views/command-center-views.json"
LIB_TEMPLATE = ROOT / "src/sharepoint/libraries/HVCG_ClientLibrary.template.json"
SAMPLE = ROOT / "sample-data/demo-pack.json"
ENV_DEV_EX = ROOT / "config/environments/development.example.json"
ENV_PROD_EX = ROOT / "config/environments/production.example.json"

VALID_FIELD_TYPES = {
    "Text", "Note", "Choice", "Number", "Currency", "DateTime",
    "Boolean", "URL", "Lookup", "User", "MultiChoice"
}
# SharePoint static name practical limit
MAX_INTERNAL_NAME = 32

ROLES = {
    "Owner", "Administrator", "OperationsManager", "ProjectManager",
    "CapitalAdvisor", "FinancialAnalyst", "OperationsAssistant",
    "Contractor", "ExternalProfessional", "ClientContact", "ReadOnlyReviewer"
}


def load(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--json-out", type=str, default="")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    info: list[str] = []

    # --- lists ---
    if not (LISTS / "_index.json").exists():
        errors.append("Missing list index")
        return _finish(errors, warnings, info, args)

    index = load(LISTS / "_index.json")
    list_names = {i["name"] for i in index["lists"]}
    if len(list_names) < 60:
        errors.append(f"Expected >=60 HVCG OS lists, found {len(list_names)}")

    all_choices: dict[str, set[str]] = {}
    lookup_pairs: list[tuple[str, str, str]] = []

    for item in index["lists"]:
        path = ROOT / item["path"]
        if not path.exists():
            errors.append(f"Missing schema file: {item['path']}")
            continue
        data = load(path)
        title = data.get("title")
        if title != item["name"]:
            errors.append(f"Title/name mismatch: {item['name']} vs {title}")

        names = [c["internalName"] for c in data["columns"]]
        dupes = [n for n, c in Counter(names).items() if c > 1]
        if dupes:
            errors.append(f"{title}: duplicate internal names {dupes}")

        if "Title" not in names:
            errors.append(f"{title}: missing Title column")

        for c in data["columns"]:
            iname = c["internalName"]
            if len(iname) > MAX_INTERNAL_NAME:
                errors.append(f"{title}.{iname}: internal name length {len(iname)} > {MAX_INTERNAL_NAME}")
            if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", iname):
                errors.append(f"{title}.{iname}: invalid internal name characters")

            ftype = c.get("type")
            if ftype not in VALID_FIELD_TYPES:
                errors.append(f"{title}.{iname}: invalid field type '{ftype}'")

            if ftype == "Choice":
                choices = c.get("choices") or []
                if not choices:
                    errors.append(f"{title}.{iname}: Choice without choices")
                all_choices[f"{title}.{iname}"] = set(choices)
                if c.get("default") is not None and c["default"] not in choices:
                    errors.append(f"{title}.{iname}: default '{c['default']}' not in choices")

            if ftype == "Lookup":
                target = c.get("lookupList")
                if not target:
                    errors.append(f"{title}.{iname}: Lookup missing lookupList")
                elif target not in list_names:
                    errors.append(f"{title}.{iname}: lookup target '{target}' not defined")
                else:
                    lookup_pairs.append((title, iname, target))

            if c.get("indexed") and ftype == "Note":
                warnings.append(f"{title}.{iname}: Note columns generally cannot be indexed")

    # required automation logs present
    for required in ("HVCG_AutomationLogs", "HVCG_Clients", "HVCG_Projects", "HVCG_Tasks",
                     "HVCG_DocumentRequests", "HVCG_Deliverables", "HVCG_Templates"):
        if required not in list_names:
            errors.append(f"Required list missing: {required}")

    info.append(f"lists={len(list_names)} lookups={len(lookup_pairs)}")

    # --- config folders ---
    cfg = load(CONFIG)
    folders = cfg.get("documentFolderStructure") or []
    if len(folders) != 24:
        errors.append(f"Expected 24 folders 00-23, found {len(folders)}")
    else:
        for i, name in enumerate(folders):
            prefix = f"{i:02d} "
            if not name.startswith(prefix):
                errors.append(f"Folder index mismatch at {i}: '{name}' expected to start with '{prefix}'")

    lib = load(LIB_TEMPLATE)
    if lib.get("folders") != folders:
        errors.append("Library template folders do not match config.documentFolderStructure")

    # --- views ---
    if VIEWS.exists():
        views = load(VIEWS)
        for v in views.get("views", []):
            if v.get("list") not in list_names:
                errors.append(f"View references unknown list: {v.get('list')}")
    else:
        warnings.append("command-center-views.json missing")

    # --- templates ---
    tindex = load(TEMPLATES / "_index.json")
    if tindex.get("count") < 18:
        errors.append(f"Expected >=18 templates, found {tindex.get('count')}")

    doc_categories = set()
    # pull from DocumentRequests schema
    dr = load(LISTS / "HVCG_DocumentRequests.json")
    for c in dr["columns"]:
        if c["internalName"] == "DocumentCategory":
            doc_categories = set(c.get("choices") or [])
    deliv_types = set()
    dd = load(LISTS / "HVCG_Deliverables.json")
    for c in dd["columns"]:
        if c["internalName"] == "DeliverableType":
            deliv_types = set(c.get("choices") or [])

    for tmeta in tindex["templates"]:
        tpath = ROOT / tmeta["path"]
        if not tpath.exists():
            errors.append(f"Missing template: {tmeta['path']}")
            continue
        t = load(tpath)
        keys = {task["key"] for task in t.get("tasks", [])}
        for task in t.get("tasks", []):
            for dep in task.get("dependsOn") or []:
                if dep not in keys:
                    errors.append(f"{t['templateKey']}: task {task['key']} depends on missing {dep}")
            role = task.get("defaultRole")
            if role and role not in ROLES:
                errors.append(f"{t['templateKey']}: unknown role '{role}' on {task['key']}")
        for doc in t.get("requiredDocuments") or []:
            cat = doc.get("documentCategory")
            if cat and cat not in doc_categories:
                errors.append(f"{t['templateKey']}: document category '{cat}' not in list choices")
            folder = doc.get("folderTarget")
            if folder and folder not in folders:
                errors.append(f"{t['templateKey']}: folderTarget '{folder}' not in 00-23 structure")
        for d in t.get("deliverables") or []:
            dtype = d.get("deliverableType")
            if dtype and dtype not in deliv_types:
                errors.append(f"{t['templateKey']}: deliverableType '{dtype}' not in list choices")
        for m in t.get("milestones") or []:
            if not isinstance(m.get("offsetDays"), int):
                errors.append(f"{t['templateKey']}: milestone {m.get('key')} offsetDays not int")

    info.append(f"templates={tindex.get('count')}")

    # --- flows ---
    findex = load(FLOWS / "_index.json")
    flow_names = {f["flowName"] for f in findex["flows"]}
    expected_flows = {
        "HVCG_ClientOnboarding", "HVCG_CreateProjectFromTemplate", "HVCG_CreateClientWorkspace",
        "HVCG_CreateDocumentRequests", "HVCG_MissingDocumentReminders", "HVCG_OverdueTaskEscalation",
        "HVCG_DeliverableApproval", "HVCG_RenewalReminders", "HVCG_ExecutiveDecisionEscalation",
        "HVCG_WeeklyStatusSummary"
    }
    missing_flows = expected_flows - flow_names
    if missing_flows:
        errors.append(f"Missing priority flows: {sorted(missing_flows)}")

    # automation references in templates
    for tmeta in tindex["templates"]:
        t = load(ROOT / tmeta["path"])
        for trig in t.get("automationTriggers") or []:
            if trig.startswith("HVCG_") and trig not in flow_names and trig not in {
                "On ClientStage=Active Client", "On EngagementStatus=Active", "On template instantiate",
                "Deliverable approval flow", "Document reminders", "Completion updates health",
                "Missing doc reminders", "Executive escalation on material blockers",
                "Stale document flags", "Deliverable approval", "Deliverable executive approval",
                "External share approval", "Change request on out-of-scope", "SOP index entry in HVCG_SOPs",
                "External share approval flow", "HVCG_RenewalReminders", "Archive automation optional"
            }:
                # loose check — only fail exact flow-like tokens
                if re.fullmatch(r"HVCG_[A-Za-z0-9_]+", trig) and trig not in flow_names:
                    errors.append(f"{t['templateKey']}: automation trigger '{trig}' not in flow index")

    info.append(f"flows={len(flow_names)}")

    # --- sample data ---
    if SAMPLE.exists():
        sample = load(SAMPLE)
        for client in sample.get("clients", []):
            if not client.get("ClientCode"):
                errors.append("Sample client missing ClientCode")
    else:
        errors.append("sample-data/demo-pack.json missing")

    # --- env examples ---
    for envp in (ENV_DEV_EX, ENV_PROD_EX):
        if not envp.exists():
            errors.append(f"Missing env example: {envp}")
            continue
        env = load(envp)
        for req in env.get("requiredFields") or []:
            # ensure path exists in structure
            parts = req.split(".")
            node = env
            ok = True
            for p in parts:
                if not isinstance(node, dict) or p not in node:
                    ok = False
                    break
                node = node[p]
            if not ok:
                errors.append(f"{envp.name}: requiredFields entry '{req}' path missing")
            elif isinstance(node, str) and node.startswith("REQUIRED_SET_ME"):
                info.append(f"{envp.name}: {req} correctly marked REQUIRED")

    # Power platform solution scaffold
    sol = ROOT / "src/power-platform/solutions/HVCGCommandCenterDev"
    if not (sol / "solution.manifest.json").exists():
        errors.append("Power Platform solution manifest missing")
    defs = ROOT / "src/power-automate/definitions/_index.json"
    if not defs.exists():
        errors.append("Flow definitions index missing")
    else:
        dcount = load(defs).get("count", 0)
        if dcount < 10:
            errors.append(f"Expected >=10 flow definitions, found {dcount}")

    report = {
        "pass": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "info": info,
        "counts": {
            "lists": len(list_names),
            "lookups": len(lookup_pairs),
            "templates": tindex.get("count"),
            "flows": len(flow_names),
            "folders": len(folders),
        },
    }
    return _finish(errors, warnings, info, args, report)


def _finish(errors, warnings, info, args, report=None) -> int:
    if args.json_out and report is not None:
        Path(args.json_out).write_text(json.dumps(report, indent=2), encoding="utf-8")

    if errors:
        print("CRITICAL FAILURES:")
        for e in errors:
            print(f"  ERROR: {e}")
    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  WARN: {w}")
    for i in info:
        print(f"  INFO: {i}")

    if errors:
        print("RESULT: FAIL")
        return 1
    if args.strict and warnings:
        print("RESULT: FAIL (strict warnings)")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
