# UAT Environment Finding — Wrong Runtime Provenance

**ID:** `UAT-ENV-001`  
**Classification:** `UAT_ENVIRONMENT / WRONG_RUNTIME_PROVENANCE`  
**Severity:** HIGH for UAT integrity · **not** a Production architecture defect  
**As of:** 2026-08-12  
**Related:** UAT-01 / UAT-FIND-001 (Owner FAIL on discoverability was partly explained by this)

## Summary

Owner UAT on `http://127.0.0.1:5180` previously exercised Elite from **`atlas-local-ai-operations`**, not the remediation worktree **`atlas-usable-operating-layer`**.

## Expected vs actual (prior attempt)

| | |
|--|--|
| **Expected** | `atlas-usable-operating-layer` · branch `fix/atlas-usable-operating-layer` |
| **Actual prior** | `atlas-local-ai-operations` Vite on `:5180` |
| **How discovered** | Process cwd / live Vite transform paths during UAT-FIND-001 FAIL investigation |
| **Impact** | Prior UI observations against `:5180` are **invalid** as acceptance evidence for usable-operating-layer intake remediation |
| **Backend evidence** | BA/Hub tests against BA worktree + Hub `:8792` remain valid where independently run |
| **Corrective action** | Stopped wrong Elite; started usable-operating-layer on `:5180 --strictPort`; added UAT runtime manifest + provenance precheck |
| **Prevention** | `CORRECT_RUNTIME_PROVENANCE` required before every Owner UAT session; do not treat port or HTTP 200 as proof |

## Evidence distinction

| Evidence class | Status |
|----------------|--------|
| UI against wrong worktree | **Invalidated** for Owner acceptance |
| BA intake pack / Hub `:8792` / suite | **Unaffected** (correct BA/Hub) |
| Corrected UI retest | **Pending** Owner PASS/FAIL on locked runtime |
