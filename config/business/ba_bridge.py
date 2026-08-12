#!/usr/bin/env python3
"""BA Hub bridge — stdin JSON → BA module call → stdout JSON.

Non-Production Elite↔BA binding entrypoint. Invoked by Integration Hub only.
No second HTTP server. Fail-closed on missing identity/client/permission.
"""

from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import atlas_security as sec  # noqa: E402


def main() -> int:
    try:
        raw = sys.stdin.read()
        req = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "status": "FORBIDDEN", "message": f"invalid_json:{e}"}))
        return 2
    try:
        out = sec.dispatch_ba_request(req)
        print(json.dumps(out, default=str))
        return 0 if out.get("ok", out.get("status") in ("SUCCESS", "OK", True)) else 1
    except Exception as e:  # pragma: no cover
        print(
            json.dumps(
                {
                    "ok": False,
                    "status": "FORBIDDEN",
                    "message": "bridge_error",
                    "errorType": type(e).__name__,
                    "traceSafe": True,
                    # never dump secrets
                    "detail": str(e)[:200],
                }
            )
        )
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
