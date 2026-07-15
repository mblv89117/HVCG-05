#!/usr/bin/env python3
"""PnP ClientId packaging + SharePoint vs Graph permission name validation."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# Allowed values for Register-PnPEntraIDAppForInteractiveLogin -SharePointDelegatePermissions
# (subset documented by PnP.PowerShell ValidateSet — keep in sync with module).
SHAREPOINT_DELEGATE_ALLOWED = frozenset(
    {
        "AllSites.FullControl",
        "AllSites.Manage",
        "AllSites.Read",
        "AllSites.Write",
        "EnterpriseResource.Read",
        "EnterpriseResource.Write",
        "MyFiles.Read",
        "MyFiles.Write",
        "Project.Read",
        "Project.Write",
        "ProjectWebApp.FullControl",
        "Sites.Search.All",
        "TaskStatus.Submit",
        "TermStore.Read.All",
        "TermStore.ReadWrite.All",
        "User.Read.All",
        "User.ReadWrite.All",
        "Sites.Selected",
    }
)

# Graph Sites.* names are valid for GraphDelegatePermissions but NOT SharePointDelegatePermissions.
GRAPH_SITES_NAMES_FORBIDDEN_ON_SHAREPOINT = frozenset(
    {
        "Sites.FullControl.All",
        "Sites.Manage.All",
        "Sites.Read.All",
        "Sites.ReadWrite.All",
    }
)


def extract_array_after(text: str, var_name: str) -> list[str]:
    """Extract string literals from `$var_name = @( ... )` block."""
    m = re.search(
        rf"\${var_name}\s*=\s*@\((.*?)\)",
        text,
        flags=re.DOTALL,
    )
    if not m:
        return []
    return re.findall(r"'([^']+)'", m.group(1))


def main() -> int:
    errors: list[str] = []

    example = ROOT / "config/environments/development.example.json"
    auth = __import__("json").loads(example.read_text()).get("authentication") or {}
    if "pnpEntraAppClientId" not in auth:
        errors.append("development.example.json missing authentication.pnpEntraAppClientId")
    if "REQUIRED" not in str(auth.get("pnpEntraAppClientId", "")):
        errors.append("example ClientId should remain a REQUIRED placeholder")

    reg = ROOT / "deployment/scripts/Register-HVCGPnPEntraApp.ps1"
    if not reg.exists():
        errors.append("Register-HVCGPnPEntraApp.ps1 missing")
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    text = reg.read_text()
    for token in [
        "Register-PnPEntraIDAppForInteractiveLogin",
        "UpdateConfig",
        "Set-HVCGPnPClientIdInConfig",
        "SharePointDelegatePermissions",
        "GraphDelegatePermissions",
    ]:
        if token not in text:
            errors.append(f"Register script missing {token}")

    sp = extract_array_after(text, "spDelegate")
    graph = extract_array_after(text, "graphDelegate")
    if not sp:
        errors.append("Could not parse $spDelegate permission array")
    if not graph:
        errors.append("Could not parse $graphDelegate permission array")

    for p in sp:
        if p not in SHAREPOINT_DELEGATE_ALLOWED:
            errors.append(f"SharePointDelegatePermission '{p}' not in allowed set")
        if p in GRAPH_SITES_NAMES_FORBIDDEN_ON_SHAREPOINT:
            errors.append(f"SharePointDelegatePermission must not use Graph Sites.* name '{p}' — use AllSites.*")

    if "AllSites.FullControl" not in sp:
        errors.append("SharePoint delegated list must include AllSites.FullControl")
    if "Sites.FullControl.All" in sp:
        errors.append("Sites.FullControl.All must not be in SharePointDelegatePermissions")

    # Graph may include Sites.FullControl.All; must not put AllSites.* names into Graph list accidentally as only Graph names — AllSites is SharePoint-only.
    for p in graph:
        if p.startswith("AllSites."):
            errors.append(f"GraphDelegatePermission '{p}' looks like SharePoint AllSites.* — keep SharePoint/Graph separate")

    # Common Graph delegated names we configure should be present
    for req in ("User.Read", "Group.ReadWrite.All", "Directory.Read.All"):
        if req not in graph:
            errors.append(f"Graph delegated list missing '{req}'")

    dep = (ROOT / "deployment/lib/HVCG.Deployment.psm1").read_text()
    for token in [
        "function Connect-HVCGPnPOnline",
        "function Initialize-HVCGPnPAuth",
        "function Resolve-HVCGPnPClientId",
        "function Set-HVCGPnPClientIdInConfig",
        "-Interactive -ClientId",
    ]:
        if token not in dep:
            errors.append(f"Deployment module missing {token}")

    deploy = (ROOT / "deployment/Deploy-HVCGDevelopment.ps1").read_text()
    if re.search(r"Connect-PnPOnline\s+-Url[^\n]*-Interactive(?![^\n]*ClientId)", deploy):
        errors.append("Deploy-HVCGDevelopment.ps1 still calls Connect-PnPOnline -Interactive without ClientId")

    doc = ROOT / "docs/deployment/PNP_AUTHENTICATION.md"
    if not doc.exists():
        errors.append("PNP_AUTHENTICATION.md missing")
    else:
        doc_text = doc.read_text()
        if "AllSites.FullControl" not in doc_text:
            errors.append("PNP_AUTHENTICATION.md should document AllSites.FullControl")
        # Should warn not to use Sites.FullControl.All on SharePoint API
        if "do not use Graph name" not in doc_text.lower() and "not use Graph name" not in doc_text:
            if "SharePoint delegated **`AllSites.FullControl`**" not in doc_text:
                errors.append("PNP_AUTHENTICATION.md should clarify SharePoint vs Graph permission names")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print("PASS pnp auth packaging checks")
    print(" SharePointDelegatePermissions=", sp)
    print(" GraphDelegatePermissions=", graph)
    return 0


if __name__ == "__main__":
    sys.exit(main())
