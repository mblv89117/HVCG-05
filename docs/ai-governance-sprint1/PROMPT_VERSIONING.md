# AI Governance Sprint 1 — Prompt Versioning Model

## Lifecycle

```text
Draft → Review → Approved → Deprecated
                    └──────→ Replaced
```

| State | Runtime eligibility |
|-------|---------------------|
| Draft | Never |
| Review | Never |
| Approved | Eligible after agent activation and permission checks |
| Deprecated | Never for new runs |
| Replaced | Never; successor version is authoritative |

## Version identity

Prompts use stable `Prompt ID` plus semantic `Version`.

Example:

```text
PROMPT-PM-CORE @ 2.4.0
```

Version numbers are immutable. Editing approved prompt text creates a new version.

## Promotion requirements

- change summary;
- owning agent;
- updated date;
- rollback version;
- human approver;
- QA result;
- risk assessment;
- tool and permission review.

## Rollback

Rollback activates a prior Approved version through a new approval event. It never silently edits the current version and never deletes history.

## Phase 1

The Prompt Registry is mock-only. “New prompt version” has no persistence or runtime effect.
