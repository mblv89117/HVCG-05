# ADR-0002 — Do not assume Cursor auto-launches agents

## Status
Accepted — 2026-07-19

## Context
Product Owner directed that orchestration must not depend on automatic multi-agent spawn.

## Decision
Specialists participate by reading shared repository state (Ready queue, heartbeats, locks). Discovery is pull-based.

## Consequences
- Master PM seeds Ready tasks; agents poll `list-ready`.
- Escalation to owner only for finance, permissions, legal, destructive actions, or multi-path business choices.
