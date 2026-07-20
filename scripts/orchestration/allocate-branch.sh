#!/usr/bin/env bash
# Allocate a unique branch + worktree path for an agent task (prints JSON).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/lib/git_worktree_guard.py" allocate "$@"
