# Atlas CEO Command Center Architecture

**Track:** 7 — Internal Operations
**Sprint:** Executive Command Center Sprint 2
**Runtime:** Local Development/UAT static web app
**Authority:** Project Atlas

## Design

```text
Project Atlas Markdown ─┐
Track 9 EOS snapshot ───┼─> read-only typed adapters ─> CEO view model
Revenue Sprint 4 model ─┤                               ├─ Executive Home
Development fixtures ───┘                               ├─ Approval Inbox
                                                        ├─ Agent Control
                                                        ├─ Portfolio
                                                        ├─ Revenue / Clients
                                                        ├─ Engineering / Release
                                                        └─ Morning Brief
```

The app extends the existing React/Vite Executive Command Center Sprint
1 shell. It does not create a new system of record.

## Data boundaries

- Atlas and EOS values are repository-derived snapshots.
- The Revenue adapter accepts only the existing Sprint 4 Development
  contract and performs no storage/network I/O.
- Client fixtures are fictional and labeled Development sample.
- Missing finance, Revenue, and client telemetry renders as Unavailable.
- “Live” is a reserved source label; no live source is enabled.

## Security

- React text rendering escapes dynamic values.
- `dangerouslySetInnerHTML` is prohibited and tested.
- No credentials, secrets, tenant auth, or Production endpoint exists.
- Approval state is browser memory only.
- No autonomous agent controls.
- No external requests in browser QA.

## Integration interfaces

### Revenue

`src/adapters/revenueAdapter.ts` validates the
`HVCG_EVA_EXEC_REVENUE` Sprint 4 model. Production intent and malformed
numeric fields are rejected.

### Engineering

`src/adapters/eosAdapter.ts` maps the Track 9 Sprint 2 snapshot without
reimplementing EOS workflow, analytics, or release logic.

### Future Microsoft 365 adapter

A future read-only adapter may map approved SharePoint/Dataverse views
from the existing executive data map. It must preserve source labels,
least privilege, client isolation, stale timestamps, and owner gates.
No such connection is authorized in this sprint.

## Rollback

Discard `.worktrees/ceo-command-center-sprint2` or return the feature
branch to base `d778f23`. No Production rollback is required.
