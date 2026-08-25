#!/usr/bin/env python3
"""Deploy HVCG flow definition JSON files into Dataverse clientdata (Production)."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parents[2]
DEFINITIONS = REPO / "src/power-automate/definitions"
REPORTS = REPO / "deployment/reports"
DV = "https://orgee2f7545.crm.dynamics.com"
API = f"{DV}/api/data/v9.2"
FLOW_NAMES = [
    "HVCG_CreateClientWorkspace",
    "HVCG_CreateProjectFromTemplate",
    "HVCG_CreateDocumentRequests",
    "HVCG_DeliverableApproval",
    "HVCG_ExecutiveDecisionEscalation",
]


def az_token(resource: str) -> str:
    raw = subprocess.check_output(
        ["az", "account", "get-access-token", "--resource", resource, "-o", "json"],
        text=True,
    )
    return json.loads(raw)["accessToken"]


def dv_call(token: str, method: str, path: str, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "If-Match": "*",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{API}/{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:4000]


def main() -> int:
    token = az_token(DV)
    report = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "dataverseUrl": DV,
        "method": "python-raw-json",
        "flows": [],
        "errors": [],
        "success": False,
    }

    for name in FLOW_NAMES:
        entry = {
            "name": name,
            "found": False,
            "workflowId": None,
            "wasActive": None,
            "patched": False,
            "reactivated": False,
            "sourceHash": None,
            "liveHashBefore": None,
            "liveHashAfter": None,
            "matchAfter": False,
            "error": None,
        }
        try:
            src = json.loads((DEFINITIONS / f"{name}.definition.json").read_text())
            # Ensure solution env-var parameters exist inside definition.parameters (required at runtime).
            _defaults = {
              "hvcg_CommandCenterSiteUrl": {"type":"String","defaultValue":"https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter"},
              "hvcg_ClientsSiteUrl": {"type":"String","defaultValue":"https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients"},
              "hvcg_ExecutiveEmail": {"type":"String","defaultValue":"manny@highvaluecapitalgroup.com"},
              "hvcg_OpsEmail": {"type":"String","defaultValue":"manny@highvaluecapitalgroup.com"},
              "hvcg_EnableClientEmails": {"type":"Bool","defaultValue": False},
              "hvcg_KnowledgeSiteUrl": {"type":"String","defaultValue":"https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge"},
            }
            params = src.setdefault("definition", {}).setdefault("parameters", {})
            for key in src.get("environmentVariables") or []:
                if key in _defaults and key not in params:
                    params[key] = _defaults[key]
            blob = json.dumps(src)
            for key, val in _defaults.items():
                if f"parameters('{key}')" in blob and key not in params:
                    params[key] = val

            clientdata_obj = {
                "properties": {
                    "connectionReferences": src["connectionReferences"],
                    "definition": src["definition"],
                },
                "schemaVersion": "1.0.0.0",
            }
            clientdata_str = json.dumps(clientdata_obj, separators=(",", ":"))
            entry["sourceHash"] = hashlib.sha256(
                json.dumps(src["definition"], separators=(",", ":"), sort_keys=True).encode()
            ).hexdigest()[:16]

            q = urllib.parse.urlencode(
                {
                    "$select": "workflowid,name,statecode,clientdata",
                    "$filter": f"category eq 5 and name eq '{name}'",
                    "$top": "1",
                }
            )
            st, data = dv_call(token, "GET", f"workflows?{q}")
            if st >= 400 or not data or not data.get("value"):
                raise RuntimeError(f"lookup failed status={st} body={data}")
            wf = data["value"][0]
            wid = wf["workflowid"]
            entry["found"] = True
            entry["workflowId"] = wid
            entry["wasActive"] = wf["statecode"] == 1
            try:
                live_obj = json.loads(wf.get("clientdata") or "{}")
                live_def = json.dumps(
                    (live_obj.get("properties") or {}).get("definition"),
                    separators=(",", ":"),
                    sort_keys=True,
                )
                entry["liveHashBefore"] = hashlib.sha256(live_def.encode()).hexdigest()[:16]
            except Exception:
                entry["liveHashBefore"] = None

            if entry["wasActive"]:
                st, body = dv_call(token, "PATCH", f"workflows({wid})", {"statecode": 0, "statuscode": 1})
                if st >= 400:
                    raise RuntimeError(f"deactivate failed {st}: {body}")

            st, body = dv_call(token, "PATCH", f"workflows({wid})", {"clientdata": clientdata_str})
            if st >= 400:
                raise RuntimeError(f"patch failed {st}: {body}")
            entry["patched"] = True

            st, body = dv_call(token, "PATCH", f"workflows({wid})", {"statecode": 1, "statuscode": 2})
            if st >= 400:
                raise RuntimeError(f"reactivate failed {st}: {body}")
            entry["reactivated"] = True

            # verify
            st, data = dv_call(token, "GET", f"workflows?{q}")
            live = json.loads(data["value"][0]["clientdata"])
            live_def = json.dumps(
                (live.get("properties") or {}).get("definition"),
                separators=(",", ":"),
                sort_keys=True,
            )
            src_def = json.dumps(src["definition"], separators=(",", ":"), sort_keys=True)
            entry["liveHashAfter"] = hashlib.sha256(live_def.encode()).hexdigest()[:16]
            entry["matchAfter"] = live_def == src_def
            if not entry["matchAfter"]:
                # Still acceptable if semantically deployed; flag mismatch
                report["errors"].append(f"{name}: live definition hash mismatch after patch")
        except Exception as e:
            entry["error"] = str(e)
            report["errors"].append(f"{name}: {e}")
            # best-effort reactivate if we deactivated
            if entry.get("workflowId") and entry.get("wasActive") and not entry.get("reactivated"):
                dv_call(token, "PATCH", f"workflows({entry['workflowId']})", {"statecode": 1, "statuscode": 2})

        report["flows"].append(entry)
        print(json.dumps(entry))

    report["success"] = all(f.get("patched") and f.get("reactivated") and not f.get("error") for f in report["flows"])
    REPORTS.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    latest_json = REPORTS / "flow-definitions-deploy-latest.json"
    stamped = REPORTS / f"flow-definitions-deploy-{stamp}.json"
    text = json.dumps(report, indent=2)
    latest_json.write_text(text)
    stamped.write_text(text)
    md_lines = [
        "# HVCG Flow Definition Dataverse Deploy",
        "",
        f"- **When:** {report['generatedAt']}",
        f"- **Dataverse:** {DV}",
        f"- **Method:** python-raw-json",
        f"- **Success:** {report['success']}",
        "",
        "## Flows",
    ]
    for f in report["flows"]:
        md_lines.append(
            f"- **{f['name']}** patched={f['patched']} reactivated={f['reactivated']} matchAfter={f['matchAfter']}"
            + (f" error={f['error']}" if f.get("error") else "")
        )
    md_lines += ["", "## Errors", "- none" if not report["errors"] else "\n".join(f"- {e}" for e in report["errors"])]
    md = "\n".join(md_lines) + "\n"
    (REPORTS / "flow-definitions-deploy-latest.md").write_text(md)
    (REPORTS / f"flow-definitions-deploy-{stamp}.md").write_text(md)
    print("SUCCESS" if report["success"] else "FAILED", latest_json)
    return 0 if report["success"] else 1


if __name__ == "__main__":
    sys.exit(main())
