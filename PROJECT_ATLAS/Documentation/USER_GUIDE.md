# Project Atlas User Guide

| Field | Value |
|---|---|
| Purpose | Help project stakeholders find trusted information without repository history or chat |
| Audience | Owner, project managers, reviewers, and non-implementation stakeholders |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |

## Find an answer

| Question | Open |
|---|---|
| What is true now? | `PROJECT_ATLAS/CURRENT_STATE.md` |
| What happens next? | `PROJECT_ATLAS/NEXT_ACTIONS.md` |
| What is blocked or gated? | `PROJECT_ATLAS/KNOWN_ISSUES.md` and `DECISIONS.md` |
| What has shipped? | `PROJECT_ATLAS/RELEASES.md` |
| Who owns a workstream? | `PROJECT_ATLAS/AGENT_ASSIGNMENTS.md` |
| What did a sprint deliver? | `PROJECT_ATLAS/SPRINT_INDEX.md` |
| Why was a decision made? | [DECISION_HISTORY_INDEX.md](DECISION_HISTORY_INDEX.md) |
| How do I resume work? | [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) |

## Interpret status safely

- `COMPLETE (Dev/Staging)` does not mean Production.
- `FROZEN — LIVE—INTERNAL` means the documented Production slice is protected from further writes.
- An open gate means owner or external action is required; documentation does not grant approval.
- A proposed sprint is not started until owner assignment is recorded.

## Current orientation

Repository evidence reviewed on 2026-07-16 records:

- Track 1: frozen live-internal Production slice.
- Revenue Sprints 1–4: complete in Development/Staging.
- Sprint 5: planning only; do not start.
- Public website/DNS, canvas publication, client outbound contact, and additional Production writes remain gated.

For current values, always re-read `CURRENT_STATE.md`; this summary is intentionally subordinate.

## Report a contradiction

Record:

1. both file paths;
2. exact conflicting statements;
3. evidence path or commit;
4. owning track;
5. requested decision.

Do not silently edit another track’s document. Submit a handoff or interface specification to the Atlas owner.

