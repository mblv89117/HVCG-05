# Owner action guide — Portal / Data Rooms

## Repo-ready (agents)

- Schema, docs, flows (Off), screens, tests, security review on `cursor/client-portal-data-rooms`

## Owner-attended next steps

1. Review `PHASE1_SAFETY_CHECK.md` and `SECURITY_REVIEW.md`
2. Merge shared index recommendations (`SHARED_FILE_RECOMMENDATIONS.md`)
3. Backup Dev → apply schema repair for `20260715_002_client_portal_data_rooms`
4. Import five portal flows; leave Off
5. Optionally build `scrPortalAdmin` / `scrDataRooms` from specs
6. Run smoke checklist
7. **Do not** enable external sharing, invite guests, or deploy Production

## Not owner-blocked for repo completion

Portal packaging does not require tenant apply to be considered repo-complete.
