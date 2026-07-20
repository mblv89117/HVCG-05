# Release promotion pipeline

```
Implementation → QA → Architecture → Security → Documentation → Release → Owner Approval (if required) → Production
```

## Mapping to task status

| Pipeline stage | Task status |
|----------------|-------------|
| Implementation | In Progress / Waiting Review |
| QA | QA |
| Architecture | Architecture Review |
| Security | Security Review |
| Documentation | Waiting Review (docs) / artifacts |
| Release | Approved → Merged |
| Owner Approval | status note + ownerDecisions[] |
| Production | Released |

## Environments

Use `registry/environments.json`. Production Power Platform remains owner-gated separately from Azure Production foundations.
