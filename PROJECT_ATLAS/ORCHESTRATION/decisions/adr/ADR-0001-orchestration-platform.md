# ADR-0001 — Repository-state orchestration platform

## Status
Accepted — 2026-07-19

## Context
Atlas grew many Cursor agents and worktrees. Owner prompting does not scale. We need an enterprise coordination layer.

## Decision
`PROJECT_ATLAS/ORCHESTRATION/` is the system of record for tasks, locks, heartbeats, decisions, releases, and knowledge.

`.agent-comms/` remains the asynchronous message bus.

## Consequences
- Every Sprint 13+ task must exist as `queue/tasks/ATLAS-T-*.json`.
- Agents claim work via orchestration CLI before editing owned paths.
- Metrics and executive dashboards read from orchestration indexes.
