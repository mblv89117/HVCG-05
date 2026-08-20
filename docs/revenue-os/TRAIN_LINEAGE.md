# Revenue Engagement OS — train lineage

**Branch:** `cursor/atlas-revenue-engagement-os`  
**Started from:** `cursor/atlas-hv-completion-52d1` @ `2a5a605`  
**Frozen Hub baseline:** `940a484` (ancestor)  
**Frozen Elite baseline:** `75d0c59` (ancestor)  

## Compatibility note

Historical design branch `cursor/revenue-os-atlas-design` @ `4c0ca6b` is **not** based on the certified Atlas freeze lineage (Hub `940a484` is not an ancestor). Design artifacts may be selectively reused only after compatibility verification against this freeze-based tip.

## Constraints

- Do not deploy Atlas production from this train.
- Do not thaw frozen Hub/Elite production runtimes.
- Offer → Pricing → Proposal must align to Integration SoT on `cursor/platform-integration-contracts`.
