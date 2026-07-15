# Executive Command Center — Screen Specs Index

| Screen / surface | Spec | Audience |
|------------------|------|----------|
| `scrHomeExec` | `src/power-apps/executive/scrHomeExec.md` | Owner |
| Phone layout | `src/power-apps/executive/layout-phone.md` | Owner |
| `cmpExecKpiTile` | `src/power-apps/executive/components/cmpExecKpiTile.md` | — |
| `cmpExecQueueCard` | `src/power-apps/executive/components/cmpExecQueueCard.md` | — |
| Power BI CEO report | `docs/executive/POWERBI_CEO_MODEL.md` | Owner group |
| Copilot brief | `docs/executive/COPILOT_EXECUTIVE.md` | Owner |

## Shared baseline (do not fork lightly)

| File | Guidance |
|------|----------|
| `src/power-apps/screens/scrHomeExec.md` | Keep as pointer / short summary; **canonical detail** lives under `src/power-apps/executive/` |
| `src/power-apps/README.md` | Recommend adding executive paths in SHARED recommendations |

## Navigation contract

scrHomeExec is entry for Owner from app shell. Deep links preserve `ClientCode` whenever present.
