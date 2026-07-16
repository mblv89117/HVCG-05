# Testing Strategy — EOS Sprint 1

## Levels

1. **Unit:** workflow stages, CR approvals, bus validation, KPI math, Master PM report generators
2. **Integration:** snapshot → engines → Command Center / Executive view models
3. **Regression:** assert Development-only UI; assert no Revenue app paths mutated in EOS work
4. **Manual:** optional local HTTP smoke of dashboards

## Command

```bash
node tests/eos/run_eos_sprint1_tests.js
```

## Exit criteria

All automated asserts PASS; QA notes filed; no Production/Track 1/Revenue mutations.
