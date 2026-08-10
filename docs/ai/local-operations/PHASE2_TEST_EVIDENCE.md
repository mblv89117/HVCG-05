# Phase 2 Test Evidence

**Date:** 2026-08-03 (local)  
**Branch:** `feature/atlas-local-ai-operations`  
**Base commit:** `52e3296` (Phase 1)

## Automated suites

| Suite | Result |
|-------|--------|
| `@hvcg/atlas-integration-core` | 21/21 PASS |
| `@hvcg/atlas-integration-api` (Phase 1 + Phase 2) | 39/39 PASS |
| `@hvcg/atlas-elite-os` build (`tsc -b && vite build`) | PASS |

## Live Ollama smoke

Script: `apps/atlas-integration-api/scripts/phase2-live-ollama-smoke.ts`  
Evidence JSON: `deployment/reports/local-ai-phase2/live-ollama-smoke.json`

| Case | Model | Duration | Result |
|------|-------|----------|--------|
| summarize_text (dental synthetic) | `glm-4.7-flash:q4_K_M` | ~115s | PASS — Waiting on Manny, validation Passed, no writes |
| prepare_decision_package (concrete synthetic) | `glm-4.7-flash:q4_K_M` | ~100s | PASS — Waiting on Manny, validation Passed, no writes |

Health: Ollama `0.32.5` at `http://127.0.0.1:11434` (loopback bind confirmed).

## Safety flags at evidence time

All remain **false** by default in code / `.env.example`:

- LocalAIWritesEnabled
- LocalAIExternalMessagesEnabled
- EvaIntakeEnabled
- ClientEmailsEnabled
- LocalAIEnabled (default false; enabled only inside smoke/test harness)
