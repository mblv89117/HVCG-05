# HVCG Engineering Operating System (EOS)

Track 9 · Sprint 2 · Development staging

## Quick start

```bash
node tests/eos/run_eos_sprint1_tests.js
node tests/eos/run_eos_sprint2_tests.js
node apps/hvcg-engineering-os/scripts/collect-live-snapshot.js
npx --yes serve apps/hvcg-engineering-os -p 5190
```

- Command Center: http://localhost:5190/
- Executive Dashboard: http://localhost:5190/executive.html

## Sprint 2 hardening

Gates · KPI SoT · XSS escape · live snapshot · bus persist · offline agent-comms bridge

See `docs/eos-sprint2/`.
