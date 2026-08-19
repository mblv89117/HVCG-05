#!/usr/bin/env python3
"""Event-driven FS watcher for release orchestrator. Emits wake only on changes."""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "events" / "inbox"
HANDLER = Path(__file__).resolve().parent / "handle-release-event.py"
ORCH = Path(
    "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/sprint12-engineering-orchestration/PROJECT_ATLAS/ORCHESTRATION"
)
WATCH = [
    INBOX,
    ORCH / "queue" / "index.json",
    ORCH / "reviews" / "queue.json",
    ORCH / "releases" / "board.json",
]


def fingerprint() -> str:
    h = hashlib.sha256()
    INBOX.mkdir(parents=True, exist_ok=True)
    for p in sorted(INBOX.glob("*.json")):
        h.update(p.name.encode())
        h.update(str(p.stat().st_mtime_ns).encode())
        h.update(str(p.stat().st_size).encode())
    for p in WATCH[1:]:
        if p.exists():
            st = p.stat()
            h.update(str(p).encode())
            h.update(str(st.st_mtime_ns).encode())
            h.update(str(st.st_size).encode())
        else:
            h.update(b"missing")
    return h.hexdigest()


def wake(reason: str) -> None:
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(
        f'AGENT_LOOP_WAKE_release_events {{"prompt":"Process release orchestrator events and refresh inventory/validations/RC packages; never deploy","reason":"{reason}","ts":"{ts}"}}',
        flush=True,
    )
    subprocess.run([sys.executable, str(HANDLER)], check=False)


def main() -> int:
    print(
        f"Event-driven release watcher online at {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}",
        flush=True,
    )
    prev = fingerprint()
    # Try watchdog if installed
    try:
        from watchdog.events import FileSystemEventHandler
        from watchdog.observers import Observer

        class Handler(FileSystemEventHandler):
            def on_any_event(self, event):  # noqa: N802
                if event.is_directory:
                    return
                wake(f"watchdog:{event.src_path}")

        obs = Observer()
        obs.schedule(Handler(), str(INBOX), recursive=False)
        for p in WATCH[1:]:
            if p.parent.exists():
                obs.schedule(Handler(), str(p.parent), recursive=False)
        obs.start()
        print("Using watchdog observer", flush=True)
        try:
            while True:
                time.sleep(3600)  # idle; events come from observer callbacks
        finally:
            obs.stop()
            obs.join()
        return 0
    except Exception as e:
        print(f"watchdog unavailable ({e}); using blocking change-detect with long idle", flush=True)

    # Change-detect: sleep long; only wake when fingerprint changes (not a readiness poll)
    while True:
        time.sleep(60)
        cur = fingerprint()
        if cur != prev:
            prev = cur
            wake("fingerprint-change")


if __name__ == "__main__":
    raise SystemExit(main())
