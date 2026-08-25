# Message Protocol

## Schema

```json
{
  "messageId": "uuid",
  "threadId": "uuid",
  "timestamp": "ISO-8601",
  "from": "agent-id",
  "to": ["agent-id"],
  "cc": [],
  "type": "INFO|REQUEST|BLOCKER|DECISION|HANDOFF|CONFLICT|ACK|RESOLVED",
  "priority": "LOW|NORMAL|HIGH|CRITICAL",
  "subject": "short subject",
  "body": "complete message",
  "relatedBranch": "",
  "relatedFiles": [],
  "requestedAction": "",
  "dueBy": null,
  "requiresAcknowledgement": true,
  "status": "NEW|READ|ACKNOWLEDGED|IN_PROGRESS|RESOLVED|REJECTED",
  "replyTo": null
}
```

## Types

| Type | Use |
|------|-----|
| INFO | Status / FYI |
| REQUEST | Action requested |
| BLOCKER | Work cannot proceed (auto-cc master-pm) |
| DECISION | Owner/PM decision needed (auto-cc master-pm) |
| HANDOFF | Ready for integration / next owner |
| CONFLICT | Related files owned by multiple agents |
| ACK | Acknowledgement of prior message |
| RESOLVED | Closure notice |

## Status flow

`NEW` → `READ` (optional) → `ACKNOWLEDGED` → `IN_PROGRESS` → `RESOLVED`  
or `REJECTED`.

ACK messages set the **original** message status to `ACKNOWLEDGED`.

## Threading

Replies must reuse `threadId` from the parent (`reply-message.sh` does this). Set `replyTo` to the parent `messageId`.

## Escalation

- `BLOCKER` / `DECISION`: always copy `master-pm` if not already addressed.
- `CRITICAL`: also create an event under `.agent-comms/events/`.
- File ownership conflicts: force `type=CONFLICT` and copy `master-pm` + `integration`.

## Forbidden content

Do not store passwords, tokens, API keys, client secrets, bearer tokens, JWTs, or confidential client PII in `subject`, `body`, or `requestedAction`. The CLI rejects common secret patterns.

## Templates

See `.agent-comms/templates/` for `message`, `status-update`, `blocker`, `decision-request`, and `handoff` starters.
