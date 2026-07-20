"""Minimal Cursor Cloud Agents API v1 client (stdlib only)."""

from __future__ import annotations

import base64
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

DEFAULT_BASE_URL = "https://api.cursor.com/v1"


class CursorApiError(RuntimeError):
    def __init__(self, message: str, *, status: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


def load_api_key(*, secrets_dir: Optional[Path] = None) -> str:
    """
    Resolve CURSOR_API_KEY without reading secrets into source control.

    Order:
      1. CURSOR_API_KEY environment variable
      2. secrets_dir/cursor_api_key file (gitignored)
      3. macOS Keychain service CURSOR_API_KEY (optional)
    """
    env = os.environ.get("CURSOR_API_KEY", "").strip()
    if env:
        return env

    root = secrets_dir or Path(__file__).resolve().parents[2] / "secrets"
    key_file = root / "cursor_api_key"
    if key_file.is_file():
        value = key_file.read_text(encoding="utf-8").strip()
        if value:
            return value

    # Optional Keychain lookup (macOS). Never log the secret.
    try:
        import subprocess

        proc = subprocess.run(
            [
                "security",
                "find-generic-password",
                "-s",
                "CURSOR_API_KEY",
                "-w",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            return proc.stdout.strip()
    except Exception:
        pass

    raise CursorApiError(
        "CURSOR_API_KEY not found. Set env CURSOR_API_KEY, write "
        "PROJECT_ATLAS/runtime/secrets/cursor_api_key, or store Keychain "
        "service CURSOR_API_KEY. Create a key at https://cursor.com/dashboard/integrations"
    )


class CursorCloudClient:
    def __init__(self, api_key: str, *, base_url: str = DEFAULT_BASE_URL):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _auth_header(self) -> str:
        token = base64.b64encode(f"{self.api_key}:".encode("utf-8")).decode("ascii")
        return f"Basic {token}"

    def request(
        self,
        method: str,
        path: str,
        *,
        body: Optional[Dict[str, Any]] = None,
        query: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        if query:
            url = f"{url}?{query}"
        data = None
        headers = {
            "Authorization": self._auth_header(),
            "Accept": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8")
                if not raw:
                    return {}
                return json.loads(raw)
        except urllib.error.HTTPError as exc:
            err_body: Any
            try:
                err_body = json.loads(exc.read().decode("utf-8"))
            except Exception:
                err_body = None
            raise CursorApiError(
                f"Cursor API {method} {path} failed: HTTP {exc.code}",
                status=exc.code,
                body=err_body,
            ) from exc
        except urllib.error.URLError as exc:
            raise CursorApiError(f"Cursor API network error: {exc}") from exc

    def create_agent(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.request("POST", "/agents", body=payload)

    def get_agent(self, agent_id: str) -> Dict[str, Any]:
        return self.request("GET", f"/agents/{agent_id}")

    def get_run(self, agent_id: str, run_id: str) -> Dict[str, Any]:
        return self.request("GET", f"/agents/{agent_id}/runs/{run_id}")

    def list_models(self) -> Dict[str, Any]:
        return self.request("GET", "/models")
