# Environment Model

Logical lanes: Development → QA → Staging → Production.

| Environment | Protected | Sprint 1 note |
|-------------|-----------|---------------|
| Development | No | Mock / worktrees |
| QA | No | Logical gate |
| Staging | Yes | Mock lane · no auto deploy |
| Production | Yes | Track 1 FROZEN · app cannot deploy |

HVCG Production identity (authoritative when re-verified): `f141a2cf-ae13-eb59-84c4-25817d899105` · `https://orgee2f7545.crm.dynamics.com/`
