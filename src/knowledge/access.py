"""HVS / Graph / Hub access probes. Never prints tokens or secrets."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

GRAPH_SCOPE = "https://graph.microsoft.com/.default"
ARM_SCOPE = "https://management.azure.com/.default"
HUB_URL = "https://app-atlas-integration-hub.azurewebsites.net"


def _post_form(url: str, data: dict[str, str]) -> dict[str, Any]:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def acquire_token(scope: str) -> str | None:
    tenant = os.environ.get("AZURE_TENANT_ID")
    client_id = os.environ.get("AZURE_CLIENT_ID")
    secret = os.environ.get("AZURE_CLIENT_SECRET")
    if not tenant or not client_id or not secret:
        return None
    try:
        tok = _post_form(
            f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            {
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": secret,
                "scope": scope,
            },
        )
    except urllib.error.HTTPError:
        return None
    token = tok.get("access_token")
    return token if isinstance(token, str) and token else None


def graph_json(url: str, token: str) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw[:200]}
        return exc.code, payload


def assess_graph_sites(token: str | None) -> dict[str, Any]:
    if not token:
        return {
            "hvs_data_access": "BLOCKED",
            "graph_sites": "NO_TOKEN",
            "owner_action": "Provide Azure client credentials with Graph Sites.Selected.",
        }
    status, payload = graph_json(
        "https://graph.microsoft.com/v1.0/sites/highvaluecapitalgroup.sharepoint.com:/sites/HVCG-CommandCenter",
        token,
    )
    err = (payload.get("error") or {}) if isinstance(payload, dict) else {}
    if status == 200:
        hvs = "PARTIAL"
        action = (
            "Command Center site is readable. Grant Sites.Selected Read on HVS historical "
            "libraries (separate tenant) — do not download/re-upload."
        )
    else:
        hvs = "BLOCKED"
        action = (
            "Grant application permission Sites.Selected to HVCG-Cursor-Automation-Azure-MCP, "
            "then SharePoint admin Read on HVCG-CommandCenter, HVCG-Clients, HVCG-Knowledge. "
            "Do not add this app to HVCG-Client-* groups (Manny-only). "
            "For HVS: Sites.Selected Read on HVS libraries or complete Hub delegated HVS connector. "
            "Do not manually download/re-upload."
        )
    return {
        "hvs_data_access": hvs if status == 200 else "BLOCKED",
        "command_center_status": status,
        "command_center_error": err.get("code"),
        "graph_roles_present": False,
        "owner_action": action,
    }


def hub_token_from_appsettings() -> str | None:
    """Client-credentials token for Hub accepted audience. Never returns secrets in result."""
    arm = acquire_token(ARM_SCOPE)
    sub = os.environ.get("AZURE_SUBSCRIPTION_ID")
    if not arm or not sub:
        return None
    url = (
        f"https://management.azure.com/subscriptions/{sub}/resourceGroups/rg-atlas-prod"
        "/providers/Microsoft.Web/sites/app-atlas-integration-hub/config/appsettings/list"
        "?api-version=2022-03-01"
    )
    req = urllib.request.Request(url, method="POST")
    req.add_header("Authorization", f"Bearer {arm}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            props = json.loads(resp.read().decode()).get("properties") or {}
    except urllib.error.HTTPError:
        return None
    raw_aud = props.get("INTEGRATION_ACCEPTED_AUDIENCES") or ""
    audiences = [a.strip() for a in raw_aud.split(",") if a.strip()]
    if not audiences:
        return None
    scope = audiences[0].rstrip("/") + "/.default"
    return acquire_token(scope)


def hub_get(path: str, token: str) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(HUB_URL + path)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode(errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw[:200]}
        return exc.code, payload


def entitlement_codes_from_appsettings() -> list[str]:
    arm = acquire_token(ARM_SCOPE)
    sub = os.environ.get("AZURE_SUBSCRIPTION_ID")
    if not arm or not sub:
        return []
    url = (
        f"https://management.azure.com/subscriptions/{sub}/resourceGroups/rg-atlas-prod"
        "/providers/Microsoft.Web/sites/app-atlas-integration-hub/config/appsettings/list"
        "?api-version=2022-03-01"
    )
    req = urllib.request.Request(url, method="POST")
    req.add_header("Authorization", f"Bearer {arm}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            props = json.loads(resp.read().decode()).get("properties") or {}
    except urllib.error.HTTPError:
        return []
    raw = props.get("INTEGRATION_CLIENT_ENTITLEMENT_GROUPS") or ""
    codes: list[str] = []
    for part in raw.split(","):
        part = part.strip()
        if ":" in part:
            _gid, code = part.split(":", 1)
            codes.append(code.strip())
    return codes
