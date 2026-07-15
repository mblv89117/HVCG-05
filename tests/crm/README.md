# Opportunity CRM tests

Offline helpers and entry points for the Opportunity CRM module.

| Artifact | Purpose |
|----------|---------|
| `smoke_helpers.py` | Shared path/artifact/Teams-policy helpers |
| `../unit/test_opportunity_lifecycle.py` | Lifecycle bridge, flows, formulas, permissions, E2E path |
| `../unit/test_opportunity_crm.py` | Module packaging / views / migration gates |
| `../../scripts/Test-HVCGOpportunityCrmAcceptance.ps1` | Offline acceptance runner (`-Offline` default) |
| `../../docs/crm/SMOKE_TEST_CHECKLIST.md` | Owner-run Dev smoke after schema apply |

```bash
python3 tests/crm/smoke_helpers.py
python3 tests/unit/test_opportunity_lifecycle.py
pwsh -File ./scripts/Test-HVCGOpportunityCrmAcceptance.ps1 -Offline
```
