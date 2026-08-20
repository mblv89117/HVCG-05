# Contract Versioning

## Rules

1. Every payload includes an explicit `contractVersion` or envelope `version` (`name.vN`).
2. Additive optional fields are backward-compatible within the same `vN`.
3. Removing/renaming fields, changing enums/meanings, or tightening required sets is a **breaking** change → publish `vN+1`.
4. Consumers MUST ignore unknown optional fields (forward compatible) unless `additionalProperties: false` on that object forbids them — producers then cannot add silently without version bump when closed schemas are in force.
5. Dual-publish period: producers may emit both versions only with owner approval; receivers accept N and N-1 during migration.
6. Silent contract drift is a P0 process failure — schemas + consumer tests are the control.

## Compatibility tests

`tests/integrations/test_contract_schemas.py` and journey fixtures pin:

- Required field presence
- Const governance flags (`observationOnly`, `liveDispatch`, `paidAdsEnabled`, etc.)
- Idempotency key patterns
- Identity pattern for `ClientCode`

Product trains must not weaken these consts in adapters.
