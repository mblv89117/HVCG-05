# Contract Conflicts and Canonical Resolutions

Inspection sources (fetched read-only, not merged) — directive 5 tips:

| Requested branch | Tip | This-worker fetch |
| --- | --- | --- |
| `cursor/atlas-revenue-engagement-os` | `85def0e` | Fetched on `hvcg-05` |
| `cursor/360-gtm-agent-system` | `14d8e4d` | Git remote 404; GitHub MCP `.env.example` + `nurturePlanSchema` |
| `cursor/gcc-client-value-os` | `8d757cf` | Unchanged vs D4 |
| `cursor/copilot-production-completion` | `fe3db75` | Git remote 404; GitHub MCP + Supervisor V2 2030Z |
| `cursor/atlas-security-patch-od005` | `9e5d10a` | Fetched read-only (XSYS owner; not merged) |
| `cursor/platform-integration-contracts` | `8f46a89` | This branch (SoT meaning `773b510`; based-on `8fb9af7`) |

Prior substitutes (`360-hv-completion-52d1`, `gcc-hv-completion-52d1`, `copilot-hv-completion-52d1`) remain historical ancestry only.

## Conflicts found

| Conflict | Systems | Resolution (canonical) |
| --- | --- | --- |
| Dual Copilot handoff shapes: slim `agent-copilot-handoff.v1` vs rich `atlas-lead-handoff.v1` | Atlas registry vs Copilot | **Both kept with distinct edges**: capital observation vs lead intake. Mission name `agent-copilot-assessment-handoff.v1` covers assessment→Atlas without collapsing edges. |
| Copilot tip requires PascalCase + camelCase dual fields (CC-001) | Copilot last contract-visible `7e63a6d`; declared tip `2f02702` not fetchable here | **Fail-safe holds:** camelCase required; PascalCase optional aliases only if equal. See `adapters/copilot-lead-handoff-aliases.md`. |
| 360 Zod-only `360-atlas-lead.v1` absent from Atlas schema folder | 360 vs Atlas | **Published** `360-atlas-lead.v1.json` in Atlas contract registry. |
| GTM additive `360-atlas-gtm-sync.v1` unratified | GTM tip vs Integration | **Ratified** `360-atlas-gtm-sync.v1.json` (observation-only, liveDispatch false). |
| GCC activation schema lived only in GCC repo | GCC vs Atlas | **Mirrored** `atlas-gcc-client-activation.v1.json` + mission alias `atlas-to-gcc-handoff.v1.json`. |
| GCC `gcc-atlas-signal.v1` vs Integration `gcc-value-signal.v1` (CC-006) | GCC vs Integration | **Canonical = gcc-value-signal.v1**; peer producer schema + adapter map published. |
| `Organization` vs `Client` | 360/GCC/Copilot vs Atlas | Typed refs + explicit mapping; `ClientCode` pattern enforced; org UUIDs never accepted as ClientCode. |
| “Opportunity” overload | Copilot MRI vs Atlas CRM vs capital | Separate fields/entities; MRI opportunities cannot create `HVCG_Opportunities`. |
| Idempotency registry incomplete vs handoff table | Atlas docs | **Expanded** `idempotency-keys.v1.json` with 360/copilot/activation/GCC/booking/engagement/learning. |
| `client-activation.v1` omitted from prior schema list | Docs | Listed + superseded-compatible `client-activation-event.v1` with envelope. |
| EVA markdown (revenue-os design) vs JSON schema | Atlas branches | JSON Schema `eva-crm-payload.v1` is canonical for machine verification. |
| Campaign/UTM not on `HVCG_Leads` columns | Atlas data model | Formalized in `attribution-lineage.v1`; product train must preserve in payload until list migration (ATLAS-INT-002). |
| SYSTEM INDEX points at `integration/atlas-canonical` while contracts lived on hv-completion | Docs | This coordination branch is contract SoT; Atlas product baseline SHAs frozen separately. |
| XSYS-01/02 intake key without body HMAC + unbound idempotency prefix | Frozen Hub `940a484` (LIVE_PRODUCTION_P0) | **Fail-safe:** documented only on this train. Hub remediation candidate `cursor/atlas-security-patch-od005` @ `9e5d10a` (RT D23 FIXED_REVALIDATED). Do not patch Hub from contracts. |
| GTM `createNurturePlan` existed without a published Integration schema | GTM `e0dd445` vs Integration | **Published** `nurture-plan.v1.json` matching `nurturePlanSchema` (GitHub MCP @ `e0dd445`). Observation-only; no live send. |

## Circular dependencies

None introduced. Directional edges only:

`360/EVA/Copilot → Atlas → GCC` and `GCC → Atlas (signals)` and `Atlas → 360 (learning)`.
No GCC → 360 direct CRM path; no Copilot → GCC.

## Security weaknesses noted on product branches

| Issue | Mitigation in contracts |
| --- | --- |
| Live dispatch flags must stay false until owner gate | Const `liveDispatch:false` / `paidAdsEnabled:false` |
| GCC platform_admin receiver could be over-privileged if reused | Edge-scoped; persist-only; no auto-provision consts |
| Prompt-sized free text in observations | `maxLength` / `maxItems` on schemas |
| Identity confusion ClientCode vs org UUID | Pattern + typed-ref + security tests |
