# 07 — Seed-Data Strategy

## Rules

1. **Never** load sample packs to Production.
2. Every seed file declares `dataProvenance: "sample"` (or `test` for automated suites).
3. Do **not** invent financials labeled `verified`. Demo currency amounts are `sample` only.
4. Use realistic names (HVCG, Colorado Craft Beef) — **no Lorem Ipsum**.
5. Emails use `@hvcg.example` / `@ccb.example` domains.
6. Idempotent loads via `HVCG_IdempotencyKey`.

## Packs

| Pack | Path | Purpose |
|------|------|---------|
| Foundation seed | `sample-data/atlas-foundation/` | Organizations, workspaces, roles, periods, CCB client stub |
| Legacy demo | `sample-data/demo-pack.json` | Existing synthetic clients (SRM01, HVD01, …) |
| Executive fixtures | `sample-data/executive/` | Offline KPI arithmetic (`test`) |

## Foundation seed contents

| File | Contents |
|------|----------|
| `seed-manifest.json` | Provenance, version, load order, environment gate |
| `organizations.json` | ORG-HVCG, ORG-CCB |
| `workspaces.json` | WS-HVCG-INTERNAL, WS-HVCG-EXEC, WS-CCB |
| `roles.json` | Role catalog aligned to Entra group hints |
| `financial-periods.json` | 2026-01 … 2026-12 (`sample`) |
| `clients-ccb.json` | Colorado Craft Beef client stub — **no verified financials** |
| `kpi-records.sample.json` | Example calculated KPI rows for Exec dashboard wiring |

## Load order

1. Organizations  
2. Workspaces  
3. Roles  
4. FinancialPeriods  
5. Clients (+ Contacts)  
6. Remaining domain demos (optional legacy pack)  
7. KpiRecords (after periods + clients)

## Environment gates

| Environment | Allowed provenance |
|-------------|--------------------|
| Local / Dev | sample, test |
| UAT | sample, test, imported (sanitized) |
| Production | imported, calculated, verified only — **no sample/test** |

## Sanitization for imported Dev copies

- Strip TINs, full account numbers, real SSNs  
- Hash or tokenize contact emails unless owner-authorized  
- Relabel provenance to `imported` after scrub  
