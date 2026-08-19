# Environment Definitions — Project Atlas

Four environments are defined under `deployment/atlas/environments/`.

## Matrix

| ID | Label | Connect | Deploy | Blue/Green | Status |
|----|-------|---------|--------|------------|--------|
| development | HVCG Development | Yes | Yes | Off | **Active target** |
| testing | HVCG Testing | Yes | No | Off | Scaffold |
| staging | HVCG Staging | Yes | No | On (doc) | Scaffold |
| production | HVCG Production | **No** | **No** | Future | Definition only |

## Files

- `development.json`
- `testing.json`
- `staging.json`
- `production.json` — blocked by Atlas hard rules
- `environments.index.json` — registry

## Binding to repo config

Atlas definitions are **framework metadata**. Runtime secrets and live URLs stay in:

- `config/environments/development.example.json` → local `development.json` (gitignored)
- `config/environments/test.example.json`
- `config/environments/production.example.json`

Atlas must not embed tenant secrets or live Production identifiers for connection use.

## Promotion path

```text
development → testing → staging → production
```

Each hop requires:

1. Pre-flight PASS  
2. Health PASS  
3. Smoke PASS  
4. Post-deploy validation PASS  
5. Owner / QA gate as defined in Release Pipeline  

Production hop is **out of scope** for this Atlas delivery.
