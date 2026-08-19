# stash@{0} Hub hardening patches — NOT APPLIED

Prepared from stash@{0} (`non-elite leftovers during 97e7a46 cutover`).
`stash@{0}` was not applied or dropped.

- Wave 1: fail-closed error contract, overlay parse cap, Graph page cap, injection defenses.
- Wave 2: PM command-center/milestones/listLeads. **Conflicts with live CRM Hub `a43803e`.** Do not apply Wave 2 onto `feature/atlas-crm-operator` or production Hub. Hand-port only `listAuthorizedMilestones` if needed; do not drop `listAuthorizedLeads`.
- Never cherry-pick `CURRENT_STATE.md` from the stash (stale Hub SHA).

See [HUNKS.md](HUNKS.md) for per-hunk classification vs live Hub `a43803e`. Wave 1 items remain **STILL NEEDED** but not P0/P1. Wave 2 is **CONFLICTING/UNSAFE**.
