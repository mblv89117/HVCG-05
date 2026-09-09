# ATLAS.md — HVCG-05 (Atlas Core)

```
CONSTITUTION = HVCG-CONSTITUTION-2026-09-04-v1.0
CANONICAL_GOVERNANCE = mblv89117/hvcg-platform-governance
PLATFORM = Atlas
PLATFORM_MODEL = ONE_PLATFORM_MULTI_REPO
REPOSITORY_ROLE = ATLAS_CORE
CONSTITUTION_PRECEDENCE = TRUE
```

## Authority

This repository implements **Atlas Core** (Hub + Elite + SharePoint `HVCG_*` SoR + Graph fabric).
It is not a second HVCG master platform. Module repos inherit governance; they do not fork strategy.

Instruction precedence: Constitution → legal/security → approved governance → Owner Directives → Master Execution Directive → repo instructions → task instructions.

## Production lineage (Wave 0)

- Production tracking branch: `production/atlas-core`
- Do **not** base Atlas implementation work on stale `cursor/v1.1.0-intelligence-ai-ops`
- Live Hub and Elite SHAs are recorded in governance `registry/ATLAS_PRODUCTION_CURRENT.json`
- Do not redeploy solely to equalize Hub/Elite SHAs
- Unknown ClientCode: **FAIL CLOSED**

## Status SoR

Operational production truth lives in `hvcg-platform-governance` registries.
`PROJECT_ATLAS/CURRENT_STATE.md` (and similar) may be historical — never treat as live production SoR without the registry.

## Preserve

Working Hub/Elite production, Communication Policy Center (`GLOBAL_AUTO_RESPOND = FALSE`), fail-closed ClientCode, website EVA lead ingest, fabric sync honesty.
