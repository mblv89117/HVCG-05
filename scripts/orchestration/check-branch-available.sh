#!/usr/bin/env bash
# Fail if a branch is already attached to another worktree (or is protected).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH=""
WORKTREE=""
AGENT="unknown"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    --worktree) WORKTREE="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$BRANCH" ]]; then
  echo "Usage: check-branch-available.sh --branch <name> [--worktree <path>] [--agent <id>]" >&2
  exit 2
fi
ARGS=(check-branch "$BRANCH" --agent "$AGENT")
if [[ -n "$WORKTREE" ]]; then
  ARGS+=(--worktree "$WORKTREE")
fi
exec python3 "$SCRIPT_DIR/lib/git_worktree_guard.py" "${ARGS[@]}"
