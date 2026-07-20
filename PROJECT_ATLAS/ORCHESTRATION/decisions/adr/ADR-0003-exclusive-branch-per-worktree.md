# ADR-0003 — Exclusive branch per agent worktree

**Status:** Accepted  
**Date:** 2026-07-20  
**Deciders:** Master PM (orchestration), Owner (policy confirm)

## Context

Git allows a branch to be checked out in only one worktree. Sprint 12 migration failed with:

`fatal: 'cursor/agent-communications' is already used by another worktree`

Multiple Atlas agents were instructed or defaulted onto shared branch names (especially `cursor/agent-communications`), causing blocked checkouts and risk of cross-agent overwrites.

## Decision

1. Every specialist agent must use a **dedicated branch and worktree**.
2. Branch names follow `cursor/<agentId>/<purpose>[-<taskId>]`.
3. Orchestration claim/start tooling **refuses** branches that are already attached elsewhere or are protected.
4. Existing work is preserved via in-place renames and new branches from current HEAD — **no history rewrite, no forced deletes**.

## Consequences

- Agents must allocate a unique branch before starting work.
- `cursor/agent-communications` remains the main checkout only.
- Registry `branches.json` becomes the live attachment map.
- Slightly more branches to track; far fewer checkout conflicts.
