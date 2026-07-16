# HVCG AI Governance

Internal, mock-only AI control plane for Sprint 1 Phase 1.

## Run

```bash
npm install --cache .npm-cache
npm run dev
```

## Verify

```bash
npm run build
npm run test
GIT_STATUS_PATHS="$(git -C ../.. status --porcelain -uall | cut -c4-)" npm run qa
npm run qa:browser
```

## Safety

- no API calls;
- no live billing;
- no Production connection;
- no deployment;
- no persistence;
- approval buttons are visual mock controls only.
