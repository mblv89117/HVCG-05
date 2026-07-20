# Review workflow

## Gates (in order when requiredReviews lists them)

1. **Implementation complete** → status `Waiting Review`
2. **QA** → `QA` then pass/fail
3. **Architecture Review** → `Architecture Review`
4. **Security Review** → `Security Review`
5. **Documentation** → docs artifacts linked
6. **Approved** → ready for merge
7. **Merged** → commit SHAs recorded
8. **Released** / **Closed**

## Rules

- Reviewers claim the task (or a linked review task) before commenting.
- Failures return status to `In Progress` with `blockedBy` notes.
- Owner review only when `owner` in requiredReviews or escalation policy triggers.
