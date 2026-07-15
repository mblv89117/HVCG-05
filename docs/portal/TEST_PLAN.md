# Test plan — Client Portal & Secure Data Rooms

## Offline (required every milestone)

```powershell
python3 tests/unit/test_client_portal_data_rooms.py
```

Covers: migration safety, default flags, library template, templates, flow Off/default policies, demo pack, docs presence, env secureDataRooms remains false.

## Dev smoke (owner-attended after schema apply)

See `SMOKE_TEST_CHECKLIST.md`.

## Negative tests

| # | Action | Expected |
|---|--------|----------|
| N1 | Set InviteSent=true on participant | Audit ExternalInviteBlocked; no Graph invite |
| N2 | NotifyClient=true with flag false | BlockedExternal; no email |
| N3 | PortalVisible doc request with PortalEnabled=false | Not shown in portal filter formula |
| N4 | Attempt anonymous link on data room library | Denied by policy / template |

## Regression

- CRM flows unchanged (hash / path check)
- deployment/** untouched
- Executive module paths unused on this branch
