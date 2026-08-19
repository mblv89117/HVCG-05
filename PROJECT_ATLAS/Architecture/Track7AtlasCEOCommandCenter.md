# Track 7 — Atlas CEO Command Center

The authoritative Sprint 2 architecture is:

`docs/ceo-command-center-sprint2/architecture/ARCHITECTURE.md`

## Atlas role

Project Atlas remains the status source of truth. The app is a read-only
Development/UAT presentation layer with explicit Repository-derived,
Development sample, Unavailable, and reserved Live labels.

## Dependencies

- Track 7 existing Executive Command Center React app
- Track 9 EOS Sprint 2 snapshot
- Revenue Sprint 4 executive dashboard contract
- Existing Microsoft 365 / Dataverse executive data map (future
  read-only adapter only; not connected in this sprint)
