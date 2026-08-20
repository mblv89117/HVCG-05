# Contract Conflicts and Canonical Resolutions

Inspection sources (fetched, not merged):

| Requested branch | Available substitute |
| --- | --- |
| `cursor/atlas-revenue-engagement-os` | `cursor/atlas-hv-completion-52d1` + `cursor/revenue-os-atlas-design` (docs only) |
| `cursor/360-gtm-agent-system` | `cursor/360-hv-completion-52d1` |
| `cursor/gcc-client-value-os` | `cursor/gcc-hv-completion-52d1` |
| `cursor/copilot-production-completion` | `cursor/copilot-hv-completion-52d1` |

## Conflicts found

| Conflict | Systems | Resolution (canonical) |
| --- | --- | --- |
| Dual Copilot handoff shapes: slim `agent-copilot-handoff.v1` vs rich `atlas-lead-handoff.v1` | Atlas registry vs Copilot | **Both kept with distinct edges**: capital observation vs lead intake. Mission name `agent-copilot-assessment-handoff.v1` covers assessment→Atlas without collapsing edges. |
| 360 Zod-only `360-atlas-lead.v1` absent from Atlas schema folder | 360 vs Atlas | **Published** `360-atlas-lead.v1.json` in Atlas contract registry. |
| GCC activation schema lived only in GCC repo | GCC vs Atlas | **Mirrored** `atlas-gcc-client-activation.v1.json` + mission alias `atlas-to-gcc-handoff.v1.json`. |
| `Organization` vs `Client` | 360/GCC/Copilot vs Atlas | Typed refs + explicit mapping; `ClientCode` pattern enforced; org UUIDs never accepted as ClientCode. |
| “Opportunity” overload | Copilot MRI vs Atlas CRM vs capital | Separate fields/entities; MRI opportunities cannot create `HVCG_Opportunities`. |
| Idempotency registry incomplete vs handoff table | Atlas docs | **Expanded** `idempotency-keys.v1.json` with 360/copilot/activation/GCC/booking/engagement/learning. |
| `client-activation.v1` omitted from prior schema list | Docs | Listed + superseded-compatible `client-activation-event.v1` with envelope. |
| EVA markdown (revenue-os design) vs JSON schema | Atlas branches | JSON Schema `eva-crm-payload.v1` is canonical for machine verification. |
| Campaign/UTM not on `HVCG_Leads` columns | Atlas data model | Formalized in `attribution-lineage.v1`; product train must preserve in payload until list migration (ATLAS-INT-002). |
| SYSTEM INDEX points at `integration/atlas-canonical` while contracts lived on hv-completion | Docs | This coordination branch is contract SoT; Atlas product baseline SHAs frozen separately. |

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
