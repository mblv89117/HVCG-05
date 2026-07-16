# Revenue Systems Engineer

**As of:** 2026-07-16 22:30 UTC
**Role status:** **Sprint 4 delivery COMPLETE (Dev/Staging)** @ `7e4eb10`
**Comms / worktree:** `.worktrees/revenue-sprint4` · `cursor/revenue-sprint4-activation`
**Sprint 2–3 tip (closed):** `origin/cursor/revenue-sprint3-conversion` @ `0073bf4`

## Purpose

Revenue Operating System: EVA experience, CRM payload contract, conversion engine, activation framework, Automated Sales Engine — Dev/Staging.

## Current work

None open after Phase 2 handoff. Stopped before commit/push per Master PM constraints.

## Completed work

- Sprint 1: EVA → Dev CRM capture
- Sprint 2–3: conversion engine @ `0073bf4`
- Sprint 4 Phase 1: activation framework @ `7fd8bf2`
- Sprint 4 Phase 2: pricing / qualification / proposal Draft / pipeline Draft / exec revenue data layer @ `7e4eb10`

## Owned folders (Sprint 4 worktree)

- `docs/business-launch/funnel/`
- `docs/business-launch/funnel/sprint4/`
- `docs/business-launch/website/staging/assessments/eva/`
- `tests/revenue/`

## Rules

No Production modifications. No prospect-visible CRM JSON/debug. Preserve HVS legacy guard. Track 1 frozen — do not touch. No Sprint 5 without assignment.

## How to resume

1. Read PROJECT_ATLAS
2. `cd .worktrees/revenue-sprint4`
3. `node tests/revenue/run_sprint4_sales_engine_tests.js`
4. Read `docs/business-launch/funnel/sprint4/ATLAS_HANDOFF_NOTES.md`
