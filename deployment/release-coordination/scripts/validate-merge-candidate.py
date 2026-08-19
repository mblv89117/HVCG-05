#!/usr/bin/env python3
"""Validate a merge/release candidate against refuse rules. Never deploys."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--qa-status", default="PENDING", choices=["PENDING", "GO", "NO-GO"])
    ap.add_argument("--s0", type=int, default=0)
    ap.add_argument("--s1", type=int, default=0)
    ap.add_argument("--ts-build", default="NOT_RUN", choices=["PASS", "FAIL", "NOT_RUN"])
    ap.add_argument("--rbac", default="NOT_RUN", choices=["PASS", "FAIL", "NOT_RUN"])
    ap.add_argument("--placeholders", default="NOT_RUN", choices=["PASS", "FAIL", "NOT_RUN"])
    ap.add_argument("--fake-finance", default="NOT_RUN", choices=["PASS", "FAIL", "NOT_RUN"])
    ap.add_argument("--release-version", default="UNSET")
    ap.add_argument("--commit-sha", default="UNSET")
    ap.add_argument("--environment", default="UNSET")
    args = ap.parse_args()

    gates = {
        "REFUSE-QA-NOGO": "PASS" if args.qa_status == "GO" else "FAIL",
        "REFUSE-S0": "PASS" if args.s0 == 0 else "FAIL",
        "REFUSE-S1": "PASS" if args.s1 == 0 else "FAIL",
        "REFUSE-TS-BUILD": "FAIL" if args.ts_build == "FAIL" else ("PASS" if args.ts_build == "PASS" else "NOT_RUN"),
        "REFUSE-RBAC": "FAIL" if args.rbac == "FAIL" else ("PASS" if args.rbac == "PASS" else "NOT_RUN"),
        "REFUSE-PLACEHOLDER": "FAIL" if args.placeholders == "FAIL" else ("PASS" if args.placeholders == "PASS" else "NOT_RUN"),
        "REFUSE-FAKE-FINANCE": "FAIL" if args.fake_finance == "FAIL" else ("PASS" if args.fake_finance == "PASS" else "NOT_RUN"),
    }

    hard_fail = any(v == "FAIL" for k, v in gates.items() if k.startswith("REFUSE"))
    # NOT_RUN on critical gates also blocks deploy authorization
    incomplete = any(
        gates[k] == "NOT_RUN"
        for k in [
            "REFUSE-TS-BUILD",
            "REFUSE-RBAC",
            "REFUSE-PLACEHOLDER",
            "REFUSE-FAKE-FINANCE",
        ]
    )
    deploy_authorized = (not hard_fail) and (not incomplete) and args.qa_status == "GO"

    result = {
        "validatedAt": iso(),
        "releaseVersion": args.release_version,
        "commitSha": args.commit_sha,
        "deploymentEnvironment": args.environment,
        "qaStatus": args.qa_status,
        "refuseGateResults": gates,
        "deployAuthorized": deploy_authorized,
        "coordinatorDecision": "READY_FOR_DEPLOY" if deploy_authorized else "REFUSED",
        "notes": "Coordinator never self-deploys; QA GO required. Incomplete gates refuse authorization.",
    }
    out = Path(__file__).resolve().parents[1] / "status" / "LAST_VALIDATION.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if not hard_fail else 2


if __name__ == "__main__":
    raise SystemExit(main())
