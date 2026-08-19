# Power Automate — Product package

| Path | Role |
|------|------|
| `flows/` | Build sheets (trigger, steps, idempotency, approvals, rollback) |
| `definitions/` | Logic-app style scaffolds for Maker rebuild |
| `executive/` | Executive briefing scaffolds |
| `inventory/` | Automation Center machine catalog + registry seed |
| `connection-references/` | Service-account connection naming |

Docs: `docs/automation/`.

```bash
python3 scripts/automation/seed-automation-registry.py
python3 scripts/automation/qa-automation-package.py
```
