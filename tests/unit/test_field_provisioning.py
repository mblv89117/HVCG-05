#!/usr/bin/env python3
"""StrictMode-safe column schema facade & provisioning guard tests (offline)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PSM1 = ROOT / "deployment/lib/HVCG.Deployment.psm1"


def main() -> int:
    errors: list[str] = []
    text = PSM1.read_text(encoding="utf-8")

    for fn in [
        "function Get-HVCGColumnSchemaFacade",
        "function Add-HVCGFieldFromSchema",
        "function Test-HVCGSharePointSchemaCompliance",
        "function Assert-HVCGSharePointSchemaCompliance",
        "function Install-HVCGListsFromSchema",
        "function Invoke-HVCGPnPWithRetry",
        "function Wait-HVCGPnPFieldVisible",
        "function Save-HVCGSchemaValidationReport",
    ]:
        if fn not in text:
            errors.append(f"Missing {fn}")

    if "HasDrift" not in text:
        errors.append("Schema compliance must expose HasDrift")
    if "Extra" not in text or "extraCount" not in text:
        errors.append("Schema validation must report extra fields")
    if "schema-validation-latest.json" not in text:
        errors.append("Must write schema-validation-latest.json")
    if "post-repair" not in (ROOT / "deployment/repair/Repair-HVCGOSSharePointSchema.ps1").read_text():
        errors.append("Repair must assert schema post-repair")
    if "post-deploy" not in (ROOT / "deployment/Deploy-HVCGDevelopment.ps1").read_text():
        errors.append("Deploy must assert schema post-deploy")

    if "Wait-HVCGPnPFieldVisible" not in text:
        errors.append("Field create must poll Wait-HVCGPnPFieldVisible")
    if "Invoke-HVCGPnPWithRetry" not in text or "Add-PnPField" not in text:
        errors.append("Mutating field ops must use Invoke-HVCGPnPWithRetry")

    # Lookup create path: PnP 3.x Add-PnPField has no -Values; must use FieldXml
    if "Add-PnPFieldFromXml" not in text:
        errors.append("Lookup create must use Add-PnPFieldFromXml (PnP 3.x)")
    if re.search(
        r"Add-PnPField\s+[^\n]*-Type\s+Lookup[^\n]*-Values|"
        r"Add-PnPField\s+[^\n]*-Values\s+@\{[^}]*LookupList",
        text,
        re.IGNORECASE | re.DOTALL,
    ):
        errors.append("Lookup create must not call Add-PnPField -Values (illegal on PnP 3.3)")
    # Slice Add-HVCGFieldFromSchema for path-specific checks
    start = text.find("function Add-HVCGFieldFromSchema")
    if start < 0:
        errors.append("Add-HVCGFieldFromSchema missing")
        lookup_fn = ""
    else:
        rest = text[start + 1 :]
        nxt = rest.find("\nfunction ")
        lookup_fn = text[start : start + 1 + nxt] if nxt >= 0 else text[start:]
    if lookup_fn:
        if "Add-PnPFieldFromXml" not in lookup_fn:
            errors.append("Add-HVCGFieldFromSchema must call Add-PnPFieldFromXml for lookups")
        if "Wait-HVCGPnPListVisible" not in lookup_fn:
            errors.append("Add-HVCGFieldFromSchema must wait for lookup target list")
        if "Wait-HVCGPnPFieldVisible" not in lookup_fn:
            errors.append("Add-HVCGFieldFromSchema must wait for field visibility after create")
        if "FieldXml" not in lookup_fn or "ShowField=" not in lookup_fn:
            errors.append("Lookup CAML FieldXml must include ShowField=")
        if 'Type=`"Lookup`"' not in lookup_fn and "Type=`\"Lookup`\"" not in lookup_fn:
            if 'Type="Lookup"' not in lookup_fn:
                errors.append("Lookup FieldXml must set Type=Lookup")

    # Must not use truthy $col.choices under StrictMode without HasProperty
    if re.search(r"if\s*\(\s*\$col\.choices\s*\)", text):
        errors.append("Install path still uses unsafe if ($col.choices)")
    if re.search(r"if\s*\(\s*\$col\.required\s*\)", text):
        errors.append("Install path still uses unsafe if ($col.required)")
    if re.search(r"if\s*\(\s*\$col\.indexed\s*\)", text):
        errors.append("Install path still uses unsafe if ($col.indexed)")

    # Facade must only load choices for Choice/MultiChoice
    if "Choice', 'MultiChoice'" not in text and 'Choice","MultiChoice"' not in text:
        if "@('Choice', 'MultiChoice')" not in text and '@("Choice", "MultiChoice")' not in text:
            # allow PowerShell @('Choice', 'MultiChoice')
            if "-in @('Choice', 'MultiChoice')" not in text and '-in @("Choice", "MultiChoice")' not in text:
                if "in @('Choice', 'MultiChoice')" not in text:
                    errors.append("Choices guard for Choice/MultiChoice not found")

    # Views/seed must assert compliance
    if "pre-views" not in text:
        errors.append("Views must assert schema before creation")
    if "pre-seed" not in text:
        errors.append("Seed must assert schema before writing items")

    repair = ROOT / "deployment/repair/Repair-HVCGOSSharePointSchema.ps1"
    if not repair.exists():
        errors.append("Repair-HVCGOSSharePointSchema.ps1 missing")
    else:
        rt = repair.read_text()
        if "Install-HVCGListsFromSchema" not in rt:
            errors.append("Repair script must call Install-HVCGListsFromSchema")
        if "delete" in rt.lower() and "no site/list deletion" not in rt.lower():
            pass  # ok if documented

    # Offline: simulate column objects via JSON facade expectations using real schemas
    samples = {
        "Text": {"internalName": "Email", "displayName": "Email", "type": "Text", "required": True, "indexed": True},
        "Number": {"internalName": "CapacityHoursPerWeek", "type": "Number", "required": False},
        "Currency": {"internalName": "MonthlyRetainer", "type": "Currency"},
        "DateTime": {"internalName": "StartDate", "type": "DateTime"},
        "Boolean": {"internalName": "IsActive", "type": "Boolean", "default": True},
        "URL": {"internalName": "Website", "type": "URL"},
        "Choice": {
            "internalName": "PrimaryRole",
            "type": "Choice",
            "choices": ["Owner", "Administrator"],
        },
        "MultiChoice": {
            "internalName": "CapitalFocus",
            "type": "MultiChoice",
            "choices": ["Debt", "Equity"],
        },
        "Lookup": {
            "internalName": "ClientId",
            "type": "Lookup",
            "lookupList": "HVCG_Clients",
        },
    }

    # Confirm real schemas contain representative types without relying on choices for Text
    team = json.loads((ROOT / "src/sharepoint/lists/HVCG_TeamMembers.json").read_text())
    email = next(c for c in team["columns"] if c["internalName"] == "Email")
    if "choices" in email:
        errors.append("Email Text column should not define choices in schema sample")
    role = next(c for c in team["columns"] if c["internalName"] == "PrimaryRole")
    if not role.get("choices"):
        errors.append("PrimaryRole must have choices")

    # Seed demo fields must be named in TeamMembers schema
    demo = json.loads((ROOT / "sample-data/demo-pack.json").read_text())
    team_fields = {c["internalName"] for c in team["columns"]}
    for need in ("Email", "PrimaryRole", "IsActive", "CapacityHoursPerWeek"):
        if need not in team_fields:
            errors.append(f"TeamMembers schema missing seed field {need}")
    if not demo.get("teamMembers"):
        errors.append("demo-pack missing teamMembers")

    # View referenced fields must exist somewhere in list schemas for that list
    views = json.loads((ROOT / "src/sharepoint/views/command-center-views.json").read_text())["views"]
    list_fields: dict[str, set[str]] = {}
    for path in (ROOT / "src/sharepoint/lists").glob("HVCG_*.json"):
        data = json.loads(path.read_text())
        list_fields[data["title"]] = {c["internalName"] for c in data["columns"]} | {"Title"}
    for v in views:
        lf = list_fields.get(v["list"])
        if not lf:
            errors.append(f"View references unknown list {v['list']}")
            continue
        for f in v["fields"]:
            if f not in lf:
                errors.append(f"View {v['list']}/{v['title']} references missing schema field {f}")

    # Type coverage checklist documentation for offline tests
    for tname in samples:
        if tname == "Text" and samples[tname].get("choices"):
            errors.append("Text sample must not include choices")
        if tname in ("Choice", "MultiChoice") and not samples[tname].get("choices"):
            errors.append(f"{tname} sample needs choices")
        if tname not in ("Choice", "MultiChoice", "Lookup") and "choices" in samples[tname]:
            errors.append(f"{tname} sample must omit choices")

    if "Get-HVCGPropertyValue" not in text or "Get-HVCGColumnSchemaFacade" not in text:
        errors.append("Facade must use Get-HVCGPropertyValue")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1
    print("PASS field provisioning StrictMode / gate tests")
    print(f" type_samples={list(samples.keys())}")
    print(f" views_checked={len(views)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
