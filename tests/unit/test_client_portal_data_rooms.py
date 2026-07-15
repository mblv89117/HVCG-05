#!/usr/bin/env python3
"""Client Portal & Secure Data Rooms — offline schema/migration/safety validation."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def fail(msg: str) -> None:
    errors.append(msg)


def col_map(schema: dict) -> dict[str, dict]:
    return {c["internalName"]: c for c in schema.get("columns", [])}


def expect_default(cols: dict, name: str, expected) -> None:
    if name not in cols:
        fail(f"Missing column {name}")
        return
    actual = cols[name].get("default")
    if actual != expected:
        fail(f"{name} default expected {expected!r}, got {actual!r}")


def main() -> int:
    mig = ROOT / "releases/migrations/20260715_002_client_portal_data_rooms.json"
    diff_path = ROOT / "releases/migrations/diffs/client_portal_data_rooms_v1.json"
    if not mig.exists():
        fail(f"Missing migration {mig}")
    else:
        m = load(mig)
        if m.get("additiveOnly") is not True:
            fail("Migration must be additiveOnly")
        if "deployment" in json.dumps(m).lower() and "modifyDeployment" in json.dumps(m):
            pass
        steps = m.get("steps", [])
        if not steps or steps[0].get("diffFile") != "releases/migrations/diffs/client_portal_data_rooms_v1.json":
            fail("Migration must ApplyListDiff client_portal_data_rooms_v1.json")

    if not diff_path.exists():
        fail(f"Missing diff {diff_path}")
        print_results()
        return 1

    diff = load(diff_path)
    safety = diff.get("safety", {})
    for k, v in {
        "externalSharingDefault": "Disabled",
        "externalAccessAllowedDefault": False,
        "portalEnabledDefault": False,
        "anonymousLinksBlocked": True,
        "autoInviteGuests": False,
        "modifyDeploymentCode": False,
        "modifyCrmFlows": False,
    }.items():
        if safety.get(k) != v:
            fail(f"diff.safety.{k} must be {v!r}")

    add_titles = {x["title"] for x in diff.get("addLists", [])}
    for need in [
        "HVCG_DataRooms",
        "HVCG_DataRoomParticipants",
        "HVCG_PortalStatusUpdates",
        "HVCG_PortalAuditLog",
    ]:
        if need not in add_titles:
            fail(f"Diff missing addList {need}")
        schema_path = ROOT / f"src/sharepoint/lists/{need}.json"
        if not schema_path.exists():
            fail(f"List schema missing: {schema_path}")
        else:
            schema = load(schema_path)
            if schema.get("title") != need:
                fail(f"{need}.json title mismatch")

    rooms = load(ROOT / "src/sharepoint/lists/HVCG_DataRooms.json")
    rcols = col_map(rooms)
    expect_default(rcols, "ExternalAccessAllowed", False)
    expect_default(rcols, "PortalEnabled", False)
    expect_default(rcols, "AnonymousLinksBlocked", True)
    expect_default(rcols, "ExternalSharingMode", "Disabled")
    expect_default(rcols, "Status", "Draft")

    parts = load(ROOT / "src/sharepoint/lists/HVCG_DataRoomParticipants.json")
    pcols = col_map(parts)
    expect_default(pcols, "ExternalInviteAllowed", False)
    expect_default(pcols, "InviteSent", False)
    expect_default(pcols, "Status", "Planned")

    status = load(ROOT / "src/sharepoint/lists/HVCG_PortalStatusUpdates.json")
    scols = col_map(status)
    expect_default(scols, "IsPublished", False)
    expect_default(scols, "PortalVisible", False)
    expect_default(scols, "NotifyClient", False)

    # Diff column defaults for shared lists
    for entry in diff.get("addColumns", []):
        col = entry["column"]
        name = col["internalName"]
        if name in ("ExternalAccessAllowed", "DataRoomEnabled", "PortalVisible") and entry["list"] in (
            "HVCG_Clients",
            "HVCG_Milestones",
        ):
            if col.get("default") is not False:
                fail(f"{entry['list']}.{name} must default false in diff")

    lib = ROOT / "src/sharepoint/libraries/HVCG_DataRoomLibrary.template.json"
    if not lib.exists():
        fail("Missing data room library template")
    else:
        L = load(lib)
        perms = L.get("permissions", {})
        if perms.get("externalSharingMode") != "Disabled":
            fail("Library template externalSharingMode must be Disabled")
        if perms.get("denyAnonymousLinks") is not True:
            fail("Library template must denyAnonymousLinks")
        if perms.get("grantOptionalClientGroup", {}).get("enabledByDefault") is not False:
            fail("Client group grant must be disabled by default")

    templates_dir = ROOT / "templates/data-rooms"
    if not templates_dir.exists():
        fail("Missing templates/data-rooms")
    else:
        for name in ["diligence-standard.json", "lender-package.json", "investor-package.json", "transaction-close.json"]:
            tp = templates_dir / name
            if not tp.exists():
                fail(f"Missing template {name}")
                continue
            t = load(tp)
            if t.get("externalAccessAllowed") is not False:
                fail(f"{name}: externalAccessAllowed must be false")
            if t.get("externalSharingMode") != "Disabled":
                fail(f"{name}: externalSharingMode must be Disabled")
            if t.get("portalEnabled") is not False:
                fail(f"{name}: portalEnabled must be false")

    mod_index = ROOT / "src/sharepoint/lists/portal/_module_index.json"
    if not mod_index.exists():
        fail("Missing portal module index")
    else:
        mi = load(mod_index)
        indexed = {x["name"] for x in mi.get("lists", [])}
        for need in ["HVCG_DataRooms", "HVCG_DataRoomParticipants", "HVCG_PortalStatusUpdates", "HVCG_PortalAuditLog"]:
            if need not in indexed:
                fail(f"Module index missing {need}")

    # Ensure we did not enable secureDataRooms site in env examples (forbidden shared edit area —
    # if present unchanged is OK; if someone flipped enabled=true, fail)
    for env in ["development", "test", "production"]:
        ep = ROOT / f"config/environments/{env}.example.json"
        if ep.exists():
            cfg = load(ep)
            sdr = cfg.get("sites", {}).get("secureDataRooms", {})
            if sdr.get("enabled") is True:
                fail(f"{env}.example.json secureDataRooms.enabled must remain false")

    print_results()
    return 1 if errors else 0


def print_results() -> None:
    if errors:
        print("FAIL — Client Portal / Data Rooms offline validation")
        for e in errors:
            print(f"  - {e}")
    else:
        print("PASS — Client Portal / Data Rooms offline validation")


if __name__ == "__main__":
    sys.exit(main())
