# Signed-in SWA Client 360 — Latest

- Generated: `2026-07-22T04:41:34Z`
- **Verdict: GREEN**
- **ownerConfirmed: true** @ `2026-07-22T04:41:34Z`
- Build: `8d3c7d58102543e80ca2ef9fa364d59c980abed2` @ `2026-07-22T03:31:05Z` (`index-CxXf2tXp.js`)
- SWA: https://zealous-rock-0090c7e1e.7.azurestaticapps.net
- Hub: https://app-atlas-integration-hub.azurewebsites.net
- Account: `manny@highvaluecapitalgroup.com`

## Signed-out gate
- `/clients` → access-denied / Sign-in required
- No client names, no hub `/api/client360`, no snapshot load
- Public snapshot `clients: []` / `source: disabled-in-production`

## Authenticated (Owner UAT)
- Microsoft sign-in succeeds
- Hub `/api/client360` **HTTP 200**
- **7** live clients from hosted hub
- Sign-out removes protected access

## Absolute GO
- **GO** for signed-in SWA Client 360 gate
