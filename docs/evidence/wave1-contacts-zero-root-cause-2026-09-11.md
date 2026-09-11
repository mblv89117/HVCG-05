# Wave 1 Lane D — contacts=0 root cause

**Status:** PROVEN  
**As of:** 2026-09-11  
**Machine record:** `docs/evidence/wave1-contacts-zero-root-cause-2026-09-11.json`

## Verdict

`contacts=0` is an **empty Outlook Contacts source**, not a permissions failure and not a ClientCode filter bug.

## Evidence

1. **Graph probe:** `GET /users/{Manny}/contacts` returns **HTTP 200** with an **empty page**.
2. That shape means the call is authorized and successful — there are simply no Outlook Contacts cards to return.
3. **Fabric scope:** the fabric indexer only indexes **Outlook Contacts cards**, not mail participants (`From` / `To` / `Cc`).
4. Therefore an empty Contacts folder correctly yields **zero** fabric contact records even when mailbox traffic with client people exists.
5. **Honesty registries** correctly mark contacts **MISSING** (see accel recon dossiers / business-useful scorecard).

## ACCG01 implication

ACCG01 contacts / next-action gap = **empty source** + **no invent-history bootstrap**.

- Score remains `NOT_BUSINESS_USEFUL` until an authorized bootstrap path exists.
- Do not invent people, relationship history, or next actions to close the gap.

## Safe later step (Owner-gated)

Prepare-only bootstrap from **entitled mail participants**:

- Derive candidate contacts from entitled mail traffic.
- **Prepare only** — no automatic writes.
- Writes remain **Owner-gated**.

## Ruled out

| Hypothesis | Result |
|---|---|
| Graph permissions failure | Ruled out (HTTP 200) |
| ClientCode filter bug | Ruled out |
| Fabric silently dropping existing Contacts cards | Ruled out (source page empty) |

## Do not

- Treat contacts=0 as a Graph auth outage
- Blame ClientCode isolation for empty contacts
- Invent contact history for ACCG01
- Write contacts without Owner gate
