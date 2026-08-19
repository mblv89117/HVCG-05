# Project Atlas Operations Guide

| Field | Value |
|---|---|
| Purpose | Provide a safe read-only operations orientation and escalation path |
| Audience | Operations, Deployment, QA, and incident reviewers |
| Owner | Documentation & Knowledge Manager; deployment facts owned by Deployment Engineer |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |

## Safety posture

- This guide authorizes no deployment, Production write, flow activation, DNS change, client contact, import, or connector binding.
- Track 1 is documented as `FROZEN — LIVE—INTERNAL`.
- All external systems are mocked/unavailable for this review.
- Use approved deployment and rollback runbooks from the Deployment Engineer’s release package.

## Read order

1. `PROJECT_ATLAS/CURRENT_STATE.md`
2. `PROJECT_ATLAS/DEPLOYMENT_STATUS.md`
3. `PROJECT_ATLAS/DECISIONS.md`
4. `PROJECT_ATLAS/KNOWN_ISSUES.md`
5. Target release under `PROJECT_ATLAS/Releases/`
6. Versioned deployment/freeze package and QA evidence

## Environment interpretation

| Environment | Documentation rule |
|---|---|
| Development | Implementation/testing only; cite Dev evidence |
| Staging | Preview/UAT only; no public publishing assumption |
| Production | Owner and QA gate required; freeze package is authoritative |
| External services | Mocked until separately approved and validated |

## Operational control points

| Control | Evidence required |
|---|---|
| Deployment request | Owner approval, release scope, package checksum |
| Connection binding | Approved environment mapping and smoke result |
| Flow activation | Named flow, expected state, rollback, QA result |
| Website publish | Public publish/DNS decision |
| Client communication | BL-C1 or successor approval |
| Rollback | Tested rollback guide and retained package |

## Incident documentation

Capture symptom, environment, timestamp, affected release, safe evidence, relevant logs, containment, rollback decision, owner/QA escalation, and follow-up debt. Do not copy client records, secrets, or tenant credentials.

## Known operational documentation risk

Atlas records an external stale Master PM go-live status file and `.agent-comms` registry ownership drift. Prefer the Deployment Engineer freeze package and Atlas `OWNERSHIP.md` until owners reconcile those files.

