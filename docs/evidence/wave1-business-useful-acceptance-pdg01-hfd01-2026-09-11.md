# Wave 1 BUSINESS_USEFUL acceptance — PDG01 / HFD01

**Verdict:** `CONDITIONAL_PASS` (composition + honesty)

## Operator questions

| # | Question | PDG01 | HFD01 |
|---|----------|-------|-------|
| 1 | What is happening? | Yes (GCC signal or honest empty) | Yes (Growth360 attribution or honest empty) |
| 2 | Why does it matter? | Yes | Yes |
| 3 | What should happen next? | OBSERVE/RECOMMEND/PREPARE only | PREPARE + OBSERVE canExecute=false |
| 4 | Where did Atlas get this? | Provenance + hydrate sources | Provenance + hydrate sources |
| 5 | What is missing? | `unknown[]` / honesty | `unknown[]` / honesty |
| 6 | What requires approval? | Always listed | Paid launch + drafts |

## Caveat

Do not treat this as signed-current runtime cert. See `wave1-recert-current-sha-2026-09-11` (`PARTIAL` / signed matrix `BLOCKED` without HMAC secrets).

## Test

`npm test -w @hvcg/atlas-integration-api` includes `live-client-pilot-pdg-hfd.test.ts`.
