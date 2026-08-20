#!/usr/bin/env python3
"""Directive 7: execute the existing synthetic commercial journey and write evidence.

Does not rebuild catalogs, pricing, proposal, documents, or engagement engines.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.gates import GATES  # noqa: E402
from revenue_os.journey import JOURNEY_ID, run_synthetic_commercial_journey  # noqa: E402

OUT_DIR = ROOT / "docs" / "revenue-os" / "synthetic"
STAGES = [
    "Service/Offer catalog",
    "pricing rules",
    "opportunity commercial config",
    "proposal",
    "closed won",
    "engagement",
]


def git_sha() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except subprocess.CalledProcessError:
        return "unknown"


def main() -> int:
    sha = git_sha()
    report = run_synthetic_commercial_journey()
    gates = dict(GATES)
    unsafe = [name for name, value in gates.items() if value]
    checks = {
        "catalogServiceLines": report.get("catalog", {}).get("serviceLines") == 7,
        "catalogOffers": report.get("catalog", {}).get("offers") == 13,
        "pricingObservationOnly": bool(report.get("pricingObservationOnly")),
        "proposalSendBlocked": bool(report.get("proposalSendBlocked")),
        "proposalAccepted": report.get("proposalStatus") == "ACCEPTED",
        "engagementCreated": bool(report.get("engagementId")),
        "engagementReplay": bool(report.get("engagementReplay")),
        "wonActivatesClientFalse": report.get("wonActivatesClient") is False,
        "liveDispatchFalse": report.get("liveDispatch") is False,
        "liveGraphWritesFalse": gates.get("liveGraphWrites") is False,
        "mutatesPaidAdsFalse": report.get("mutatesPaidAds") is False,
        "autoProvisionAccessFalse": report.get("autoProvisionAccess") is False,
        "noUnsafeGates": not unsafe,
    }
    ok = bool(report.get("ok")) and all(checks.values())
    payload = {
        "directive": 7,
        "journeyId": JOURNEY_ID,
        "sha": sha,
        "capturedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "command": "python3 tests/revenue_os/run_synthetic_recert.py",
        "ok": ok,
        "stages": STAGES,
        "checks": checks,
        "unsafeGates": unsafe,
        "report": report,
        "gates": gates,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "RECERT.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Synthetic commercial journey recert — directive 7",
        "",
        f"**SHA:** `{sha}`",
        f"**Journey:** `{JOURNEY_ID}`",
        f"**Command:** `python3 tests/revenue_os/run_synthetic_recert.py`",
        f"**Result:** {'PASS' if ok else 'FAIL'}",
        f"**Captured:** {payload['capturedAt']}",
        "",
        "Existing engine only — catalogs/pricing/proposal/MSA-SOW/engagement were not rebuilt.",
        "Live Graph / live dispatch / paid ads / GCC auto-provision remain false.",
        "Won does not auto-activate a Client.",
        "",
        "## Stage evidence",
        "",
        f"- Service/Offer catalog: {report.get('catalog')} (expect 7 lines / 13 offers)",
        f"- Pricing rules: observationOnly={report.get('pricingObservationOnly')}",
        f"- Opportunity commercial config: offer={report.get('offer')}",
        f"- Proposal: status={report.get('proposalStatus')} sendBlocked={report.get('proposalSendBlocked')}",
        f"- Closed won: wonActivatesClient={report.get('wonActivatesClient')}",
        f"- Engagement: id={report.get('engagementId')} replay={report.get('engagementReplay')} "
        f"successFee={report.get('successFeeState')} referralPayoutAllowed={report.get('referralPayoutAllowed')}",
        "",
        "## Gates (all must be false)",
        "",
    ]
    for name, value in gates.items():
        lines.append(f"- `{name}` = `{value}`")
    lines.extend(
        [
            "",
            "## Check matrix",
            "",
        ]
    )
    for name, value in checks.items():
        lines.append(f"- {name}: {'PASS' if value else 'FAIL'}")
    lines.append("")
    (OUT_DIR / "RECERT.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"ok": ok, "sha": sha, "journeyId": JOURNEY_ID, "artifact": str(OUT_DIR / "RECERT.md")}, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
