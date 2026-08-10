# Phase 6A — Security Review

## Threat controls

| Risk | Control |
| --- | --- |
| Production website edit | Synthetic fixtures; sandbox writes; no live repo default apply |
| Push / merge / deploy | Hard-coded Phase 6A blocks; Git adapter forbids |
| Arbitrary shell | Predefined Git ops + `execFileSync` with fixed args only |
| Secret exposure | Discovery lists env **filenames** only; QA item for secrets; no secret fields in content blocks |
| AI autonomous publish | Forbidden ops list; Manny approval gate |
| Auth bypass | `requirePrincipal` on all `/api/website-studio/*` routes |
| Path traversal | Sandbox apply strips `..` from relative paths |

## Access

- Manny: full control (deploy still blocked in 6A)
- Local AI Operations Agent: read/analyze/draft/propose/prepare — no publish/deploy/merge
- Future Human Operator: configurable; no Production deploy by default
- Automation: build/test/QA only

## Residual risk (non-blocking)

Preview command registration is trusted config — Phase 6A does not auto-execute user-supplied shell strings from NL input.
