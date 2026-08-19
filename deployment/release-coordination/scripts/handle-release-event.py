#!/usr/bin/env python3
"""Process Atlas release orchestrator events. Never deploys."""
from __future__ import annotations

import json
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "events" / "inbox"
PROCESSED = ROOT / "events" / "processed"
INVENTORY = ROOT / "inventory" / "RC_INVENTORY.json"
STATE = ROOT / "status" / "ORCHESTRATOR_STATE.json"
REPORTS = ROOT / "reports"
VALIDATION = ROOT / "validation"
RC_DIR = ROOT / "rc-packages"
CHECKLIST = ROOT / "checklists" / "DEPLOYMENT_READINESS_CHECKLIST.md"

ORCH = Path(
    "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/sprint12-engineering-orchestration/PROJECT_ATLAS/ORCHESTRATION"
)

EVENT_TYPES = {
    "RC_ASSIGNED",
    "QA_STATUS_CHANGED",
    "MERGE_CANDIDATE_READY",
    "BLOCKING_ISSUE_RESOLVED",
    "DEPLOYMENT_APPROVAL_GRANTED",
    "ROLLBACK_REQUESTED",
    "PRODUCTION_INCIDENT",
    "SYNC_REQUESTED",
}


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def default_state():
    return {
        "mode": "event-driven",
        "updatedAt": iso(),
        "deployAuthorized": False,
        "autoDeploy": False,
        "approvals": {
            "qaGo": False,
            "masterPmApproval": False,
            "ownerApproval": False,
        },
        "qaStatus": "PENDING",
        "activeReleaseVersion": None,
        "incidentFreeze": False,
        "lastEventId": None,
        "lastEventType": None,
    }


def default_inventory():
    return {"updatedAt": iso(), "candidates": []}


def compute_deploy_authorized(state: dict) -> bool:
    if state.get("incidentFreeze"):
        return False
    a = state.get("approvals", {})
    return bool(a.get("qaGo") and a.get("masterPmApproval") and a.get("ownerApproval"))


def sync_orch_merge_candidates(inventory: dict) -> dict:
    """Additive inventory refresh from orchestration (event-triggered only)."""
    idx = ORCH / "queue" / "index.json"
    if not idx.exists():
        return inventory
    tasks = load_json(idx, {}).get("tasks", [])
    merge_statuses = {
        "Waiting Review",
        "QA Review",
        "QA",
        "Architecture Review",
        "Security Review",
        "Approved",
    }
    existing = {c.get("taskId"): c for c in inventory.get("candidates", []) if c.get("taskId")}
    for t in tasks:
        if t.get("status") not in merge_statuses and t.get("status") != "Ready":
            continue
        tid = t["id"]
        entry = existing.get(tid, {})
        entry.update(
            {
                "taskId": tid,
                "title": t.get("title"),
                "assignedAgent": t.get("assignedAgent"),
                "priority": t.get("priority"),
                "status": t.get("status"),
                "source": "orchestration",
                "updatedAt": iso(),
            }
        )
        existing[tid] = entry
    inventory["candidates"] = sorted(existing.values(), key=lambda x: x.get("taskId") or "")
    inventory["updatedAt"] = iso()
    return inventory


def write_rc_package(state: dict, event: dict) -> Path | None:
    version = event.get("releaseVersion") or state.get("activeReleaseVersion")
    if not version:
        return None
    sha = event.get("commitSha") or "UNSET"
    env = (event.get("payload") or {}).get("deploymentEnvironment", "UNSET")
    authorized = compute_deploy_authorized(state)
    pkg = {
        "schema": "atlas-release-candidate-v1",
        "releaseVersion": version,
        "commitSha": sha,
        "deploymentEnvironment": env,
        "azureSubscriptionId": "ebc84d85-b5ff-4c4b-add1-b0a8de31b319",
        "azureSubscriptionName": "HVCG Production",
        "producedAt": iso(),
        "producedBy": "deployment-manager",
        "qaStatus": state.get("qaStatus"),
        "approvals": state.get("approvals"),
        "coordinatorStatus": "READY_FOR_DEPLOY" if authorized else "BLOCKED",
        "deployAuthorized": authorized,
        "migrationRequirements": (event.get("payload") or {}).get("migrationRequirements", []),
        "rollbackPlan": (event.get("payload") or {}).get(
            "rollbackPlan",
            ["Disable affected flows/apps", "Revert to prior RC SHA", "Re-run smoke", "Notify Master PM"],
        ),
        "knownIssues": (event.get("payload") or {}).get("knownIssues", []),
        "checklistPath": str(CHECKLIST.relative_to(ROOT)),
        "triggerEvent": event.get("eventType"),
        "triggerEventId": event.get("eventId"),
        "notes": "Never auto-deploy. Requires QA GO + Master PM + Owner.",
    }
    out = RC_DIR / f"{version}.json"
    save_json(out, pkg)
    md = RC_DIR / f"{version}.md"
    md.write_text(
        "\n".join(
            [
                f"# Release Candidate — {version}",
                "",
                f"**producedAt:** {pkg['producedAt']}",
                f"**commitSha:** `{sha}`",
                f"**environment:** {env}",
                f"**qaStatus:** {pkg['qaStatus']}",
                f"**approvals:** QA={state['approvals'].get('qaGo')} · MasterPM={state['approvals'].get('masterPmApproval')} · Owner={state['approvals'].get('ownerApproval')}",
                f"**deployAuthorized:** `{authorized}`",
                "",
                "## Migration requirements",
                "",
                "- " + "\n- ".join(pkg["migrationRequirements"] or ["TBD"]),
                "",
                "## Rollback plan",
                "",
                "- " + "\n- ".join(pkg["rollbackPlan"]),
                "",
                "## Known issues",
                "",
                "- " + "\n- ".join(pkg["knownIssues"] or ["None recorded"]),
                "",
                f"Checklist: `{pkg['checklistPath']}`",
                "",
            ]
        ),
        encoding="utf-8",
    )
    return out


def refresh_validations(state: dict, inventory: dict, event: dict) -> None:
    auth = compute_deploy_authorized(state)
    VALIDATION.mkdir(parents=True, exist_ok=True)
    (VALIDATION / "DEPLOYMENT_VALIDATION.md").write_text(
        "\n".join(
            [
                "# Deployment Validation",
                "",
                f"**updatedAt:** {iso()}",
                f"**lastEvent:** {event.get('eventType')} (`{event.get('eventId')}`)",
                f"**deployAuthorized:** `{auth}`",
                "",
                "## Triple gate",
                "",
                f"- QA GO: `{state['approvals'].get('qaGo')}` (status={state.get('qaStatus')})",
                f"- Master PM approval: `{state['approvals'].get('masterPmApproval')}`",
                f"- Owner approval: `{state['approvals'].get('ownerApproval')}`",
                f"- Incident freeze: `{state.get('incidentFreeze')}`",
                "",
                "## Result",
                "",
                "PASS — may proceed to human deploy execution"
                if auth
                else "FAIL — prepare packages only; do not deploy",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (VALIDATION / "ROLLBACK_VALIDATION.md").write_text(
        "\n".join(
            [
                "# Rollback Validation",
                "",
                f"**updatedAt:** {iso()}",
                "",
                "## Checklist",
                "",
                "- [ ] Prior RC SHA identified",
                "- [ ] Rollback steps documented in active RC package",
                "- [ ] Smoke suite identified for post-rollback",
                "- [ ] Master PM notified on rollback request events",
                "",
                f"**lastRollbackEvent:** {event.get('eventType') == 'ROLLBACK_REQUESTED'}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (VALIDATION / "SMOKE_VALIDATION.md").write_text(
        "\n".join(
            [
                "# Smoke Test Validation",
                "",
                f"**updatedAt:** {iso()}",
                "",
                "## Policy",
                "",
                "- Smoke evidence required before QA GO is accepted for Prod-bound RC",
                "- Use Atlas Dev wrappers / QA harness — never silent Prod smoke without approval",
                "- Coordinator records pass/fail here when QA_STATUS_CHANGED includes smoke evidence",
                "",
                f"**smokeEvidenceInEvent:** `{bool((event.get('payload') or {}).get('smokeEvidence'))}`",
                "",
            ]
        ),
        encoding="utf-8",
    )
    REPORTS.mkdir(parents=True, exist_ok=True)
    cand_n = len(inventory.get("candidates", []))
    (REPORTS / "PRODUCTION_READINESS_REPORT.md").write_text(
        "\n".join(
            [
                "# Production Readiness Report",
                "",
                f"**updatedAt:** {iso()}",
                f"**mode:** event-driven release orchestrator",
                f"**activeReleaseVersion:** {state.get('activeReleaseVersion')}",
                f"**inventoryCandidates:** {cand_n}",
                f"**deployAuthorized:** `{auth}`",
                "",
                "## Approvals",
                "",
                f"| Gate | Value |",
                f"|------|-------|",
                f"| QA GO | {state['approvals'].get('qaGo')} ({state.get('qaStatus')}) |",
                f"| Master PM | {state['approvals'].get('masterPmApproval')} |",
                f"| Owner | {state['approvals'].get('ownerApproval')} |",
                f"| Incident freeze | {state.get('incidentFreeze')} |",
                "",
                "## Verdict",
                "",
                "**READY FOR HUMAN DEPLOY**" if auth else "**NOT READY — do not deploy**",
                "",
                "Auto-deploy is disabled permanently for this orchestrator.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def handle_event(event: dict, state: dict, inventory: dict) -> tuple[dict, dict]:
    et = event["eventType"]
    if et not in EVENT_TYPES:
        raise ValueError(f"unknown eventType {et}")

    if et == "RC_ASSIGNED":
        state["activeReleaseVersion"] = event.get("releaseVersion")
        inventory.setdefault("candidates", [])
        inventory["candidates"].append(
            {
                "releaseVersion": event.get("releaseVersion"),
                "commitSha": event.get("commitSha"),
                "taskId": event.get("taskId"),
                "status": "ASSIGNED",
                "assignedAt": iso(),
                "source": event.get("source"),
            }
        )

    elif et == "QA_STATUS_CHANGED":
        qs = event.get("qaStatus") or "PENDING"
        state["qaStatus"] = qs
        state["approvals"]["qaGo"] = qs == "GO"
        if qs == "NO-GO":
            state["approvals"]["qaGo"] = False

    elif et == "MERGE_CANDIDATE_READY":
        inventory = sync_orch_merge_candidates(inventory)
        if event.get("taskId"):
            inventory["candidates"].append(
                {
                    "taskId": event.get("taskId"),
                    "releaseVersion": event.get("releaseVersion") or state.get("activeReleaseVersion"),
                    "status": "MERGE_CANDIDATE_READY",
                    "updatedAt": iso(),
                    "source": event.get("source"),
                }
            )

    elif et == "BLOCKING_ISSUE_RESOLVED":
        state.setdefault("resolvedBlockers", []).append(
            {"id": event.get("blockingIssueId"), "at": iso(), "notes": event.get("notes")}
        )

    elif et == "DEPLOYMENT_APPROVAL_GRANTED":
        # Explicit approvals may be carried on the event
        if event.get("masterPmApproval") is True:
            state["approvals"]["masterPmApproval"] = True
        if event.get("ownerApproval") is True:
            state["approvals"]["ownerApproval"] = True
        if event.get("qaStatus") == "GO" or event.get("deploymentApprovalGranted") is True:
            # deploymentApprovalGranted alone is insufficient; still need triple gate
            pass
        if event.get("qaStatus") == "GO":
            state["qaStatus"] = "GO"
            state["approvals"]["qaGo"] = True

    elif et == "ROLLBACK_REQUESTED":
        state["lastRollbackRequest"] = {
            "at": iso(),
            "releaseVersion": event.get("releaseVersion"),
            "notes": event.get("notes"),
        }

    elif et == "PRODUCTION_INCIDENT":
        state["incidentFreeze"] = True
        state["lastIncident"] = {
            "at": iso(),
            "severity": event.get("incidentSeverity"),
            "notes": event.get("notes"),
        }

    elif et == "SYNC_REQUESTED":
        inventory = sync_orch_merge_candidates(inventory)

    state["deployAuthorized"] = compute_deploy_authorized(state)
    state["updatedAt"] = iso()
    state["lastEventId"] = event.get("eventId")
    state["lastEventType"] = et
    inventory["updatedAt"] = iso()

    write_rc_package(state, event)
    refresh_validations(state, inventory, event)
    return state, inventory


def process_file(path: Path) -> dict:
    event = load_json(path, None)
    if not event:
        raise SystemExit(f"invalid event file {path}")
    state = load_json(STATE, default_state())
    inventory = load_json(INVENTORY, default_inventory())
    state, inventory = handle_event(event, state, inventory)
    save_json(STATE, state)
    save_json(INVENTORY, inventory)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    dest = PROCESSED / f"{iso().replace(':', '')}_{path.name}"
    shutil.move(str(path), str(dest))
    return {"processed": str(dest), "deployAuthorized": state["deployAuthorized"], "eventType": event["eventType"]}


def process_inbox() -> list:
    INBOX.mkdir(parents=True, exist_ok=True)
    results = []
    for path in sorted(INBOX.glob("*.json")):
        results.append(process_file(path))
    return results


def main(argv: list[str]) -> int:
    if len(argv) > 1 and argv[1] == "--file":
        print(json.dumps(process_file(Path(argv[2])), indent=2))
        return 0
    results = process_inbox()
    print(json.dumps({"processedCount": len(results), "results": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
