# ClientId Lookup Repair Report

- **Generated:** 2026-07-21T23:11:49Z
- **Source:** DeviceLogin `AJ5Y72MX7` (long-lived process)
- **Compliant:** True
- **Get items (no $select):** OK on HVCG_Projects and HVCG_Tasks
- **Write/read OK:** True (`ACCG Inc.`)
- **Clients list GUID:** `f60a7d4e-74d9-4b57-8c98-1a7b75d76104`
- **Action taken:** No field recreate required — live ClientId lookups already target HVCG_Clients / Title
- **Note:** Full schema assert hit a Report.Log script bug after ClientId validation; lookups themselves are healthy
