# Agent Communication Bus 2.0

**Compatible with:** agent-comms v1 (`.agent-comms/templates/message.json`)
**Implementation:** `apps/hvcg-engineering-os/js/agent-bus-v2.js`
**Config:** `apps/hvcg-engineering-os/config/message-types-v2.json`

## Required fields (v2)

| Field | Purpose |
|-------|---------|
| messageId | Unique message id |
| timestamp | ISO timestamp |
| sourceAgent | Sender |
| destinationAgent | Receiver |
| priority | P0–P3 |
| status | draft → closed |
| correlationId | Cross-message correlation |
| relatedSprint | Sprint id |
| relatedTrack | Track id |
| type | assignment, status_update, progress_report, question, blocker, qa_request, release_request, atlas_update, engineering_handoff |
| body | Payload object |

## Mapping from v1 (additive)

| v1 | v2 |
|----|----|
| messageId | messageId |
| timestamp | timestamp |
| from | sourceAgent |
| to[0] | destinationAgent |
| priority | priority (normalized) |
| status | status |
| type | type (expanded enum) |
| body / subject | body |
| relatedBranch | (optional in body) |
| — | correlationId (new) |
| — | relatedSprint (new) |
| — | relatedTrack (new) |

v1 templates remain unchanged. Bus 2.0 is implemented in EOS and documented here for Sprint 2 bridge work.
