# Harness expectation — ATLAS-RT-20260820-01/02

## Intent

Isolated red-team artifact. Does **not** patch product code on Atlas product branches.

## Expected secure behavior

For any principal with roles including `HVCG Team Member` or `HVCG Owner`:

1. Opportunity visibility MUST still require ClientCode entitlement intersection
   (same rule as projects/capital), unless an explicit product-approved
   tenant-wide exception (e.g. named Manny OID) is documented and tested.
2. `canSeeOpportunity(staff, foreignOpp) === false` when
   `entitledClientCodes(staff)` does not include `foreignOpp.clientCode`.
3. `patchOpportunity` on a foreign opportunity MUST fail closed (404/403)
   before any SharePoint Graph write.

## Observed insecure behavior (candidate `2a5a605` / Hub `940a484`)

```
if (isInternalStaff(principal)) return true;
```

in `apps/atlas-integration-api/src/pm/sharepoint/repository.ts` `canSeeOpportunity`.

## How to re-check

Run from a worktree checked out to the Atlas tip under test:

```bash
node scripts/red-team/check-opportunity-staff-bypass.mjs /path/to/atlas-checkout
```

Exit code `2` = defect still present (expected until owning train remediates).
Exit code `0` = staff short-circuit removed (finding may be closable after full authz retest).
