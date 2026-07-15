#!/usr/bin/env python3
"""Refresh schema snapshot + checksums for a release."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--repo", required=True)
    args = ap.parse_args()
    root = Path(args.repo)
    version = args.version
    release = root / "releases" / f"v{version}"
    artifacts = release / "artifacts"
    checksums = release / "checksums"
    artifacts.mkdir(parents=True, exist_ok=True)
    checksums.mkdir(parents=True, exist_ok=True)

    idx = json.loads((root / "src/sharepoint/lists/_index.json").read_text())
    snapshot = {
        "version": version,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "listCount": len(idx["lists"]),
        "lists": [{"name": x["name"], "columnCount": x["columnCount"], "path": x["path"]} for x in idx["lists"]],
        "templates": json.loads((root / "templates/projects/_index.json").read_text()),
        "flows": json.loads((root / "src/power-automate/definitions/_index.json").read_text()),
        "productVersion": json.loads((root / "version.json").read_text()),
    }
    (artifacts / "schema-snapshot.json").write_text(json.dumps(snapshot, indent=2))

    critical = [
        "VERSION",
        "version.json",
        "src/sharepoint/lists/_index.json",
        "templates/projects/_index.json",
        "config/hvcg.config.json",
        "releases/migrations/20260714_001_baseline_v1_0_0.json",
        "releases/migrations/20260714_002_intelligence_ai_backup_v1_1_0.json",
        "releases/migrations/diffs/v1.0.0_to_v1.1.0.json",
        "deployment/install/Install-HVCGOS.ps1",
        "deployment/upgrade/Upgrade-HVCGOS.ps1",
        "deployment/rollback/Rollback-HVCGOS.ps1",
        "deployment/backup/Backup-HVCGOS.ps1",
        "deployment/restore/Restore-HVCGOS.ps1",
        "deployment/health/Invoke-HVCGOSOperationalHealth.ps1",
    ]
    checks = {}
    for rel in critical:
        p = root / rel
        if p.exists():
            checks[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    (checksums / "sha256.json").write_text(json.dumps(checks, indent=2))
    print(f"Snapshot lists={snapshot['listCount']} checksums={len(checks)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
