#!/usr/bin/env python3
"""Emit a release orchestrator event into events/inbox/."""
from __future__ import annotations

import argparse
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "events" / "inbox"


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--type",
        required=True,
        choices=[
            "RC_ASSIGNED",
            "QA_STATUS_CHANGED",
            "MERGE_CANDIDATE_READY",
            "BLOCKING_ISSUE_RESOLVED",
            "DEPLOYMENT_APPROVAL_GRANTED",
            "ROLLBACK_REQUESTED",
            "PRODUCTION_INCIDENT",
            "SYNC_REQUESTED",
        ],
    )
    ap.add_argument("--source", required=True)
    ap.add_argument("--release-version", default=None)
    ap.add_argument("--task-id", default=None)
    ap.add_argument("--commit-sha", default=None)
    ap.add_argument("--qa-status", default=None, choices=["PENDING", "GO", "NO-GO", None])
    ap.add_argument("--master-pm-approval", action="store_true")
    ap.add_argument("--owner-approval", action="store_true")
    ap.add_argument("--blocking-issue-id", default=None)
    ap.add_argument("--incident-severity", default=None)
    ap.add_argument("--notes", default="")
    ap.add_argument("--payload-json", default="{}")
    args = ap.parse_args()

    event = {
        "eventId": str(uuid.uuid4()),
        "eventType": args.type,
        "emittedAt": iso(),
        "source": args.source,
        "releaseVersion": args.release_version,
        "taskId": args.task_id,
        "commitSha": args.commit_sha,
        "qaStatus": args.qa_status,
        "masterPmApproval": True if args.master_pm_approval else None,
        "ownerApproval": True if args.owner_approval else None,
        "blockingIssueId": args.blocking_issue_id,
        "incidentSeverity": args.incident_severity,
        "payload": json.loads(args.payload_json),
        "notes": args.notes,
    }
    INBOX.mkdir(parents=True, exist_ok=True)
    out = INBOX / f"{event['emittedAt'].replace(':', '')}_{args.type}_{event['eventId'][:8]}.json"
    out.write_text(json.dumps(event, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"wrote": str(out), "eventId": event["eventId"], "eventType": args.type}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
