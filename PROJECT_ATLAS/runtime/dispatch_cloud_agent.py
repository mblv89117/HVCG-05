#!/usr/bin/env python3
"""Atlas → Cursor Cloud Agent dispatcher CLI."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

RUNTIME_ROOT = Path(__file__).resolve().parent
REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RUNTIME_ROOT))

from adapters.cursor.dispatcher import dispatch_task  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Dispatch an Atlas runtime task to a Cursor Cloud Agent"
    )
    parser.add_argument(
        "--task",
        required=True,
        help="Path to task JSON conforming to runtime/schemas/task.schema.json",
    )
    parser.add_argument(
        "--no-poll",
        action="store_true",
        help="Return after create; do not wait for terminal run status",
    )
    parser.add_argument(
        "--repo-root",
        default=str(REPO_ROOT),
        help="Git repo root used to resolve commit hash / files changed",
    )
    args = parser.parse_args()

    task_path = Path(args.task)
    task = json.loads(task_path.read_text(encoding="utf-8"))
    result = dispatch_task(
        task,
        repo_root=Path(args.repo_root),
        poll=not args.no_poll,
    )
    print(json.dumps(result, indent=2))
    if result.get("status") == "finished":
        return 0
    if result.get("status") == "blocked":
        return 3
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
