#!/usr/bin/env bash
# Create a dedicated worktree + unique branch for an agent. Refuses if branch is in use.
# Does not delete or overwrite existing worktrees.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="${HVCG_REPO_ROOT:-}"
if [[ -z "$ROOT" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  # Prefer main repo if we are inside .worktrees/*/scripts/...
  if [[ "$ROOT" == *"/.worktrees/"* ]]; then
    ROOT="$(cd "$ROOT/../.." && pwd)"
  fi
fi
# Climb to directory that has .git
while [[ "$ROOT" != "/" && ! -e "$ROOT/.git" ]]; do
  ROOT="$(dirname "$ROOT")"
done

AGENT=""
PURPOSE=""
TASK=""
BASE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent) AGENT="$2"; shift 2 ;;
    --purpose) PURPOSE="$2"; shift 2 ;;
    --task) TASK="$2"; shift 2 ;;
    --base) BASE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done
if [[ -z "$AGENT" || -z "$PURPOSE" ]]; then
  echo "Usage: ensure-agent-worktree.sh --agent <id> --purpose <slug> [--task <id>] [--base <branch>]" >&2
  exit 2
fi

ALLOC_ARGS=(--agent "$AGENT" --purpose "$PURPOSE")
if [[ -n "$TASK" ]]; then
  ALLOC_ARGS+=(--task "$TASK")
fi
mapfile -t ALLOC < <(python3 "$SCRIPT_DIR/lib/git_worktree_guard.py" allocate "${ALLOC_ARGS[@]}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["branch"]); print(d["worktree"])')
BRANCH="${ALLOC[0]}"
WT_REL="${ALLOC[1]}"
WT_ABS="$ROOT/$WT_REL"

echo "Allocated branch=$BRANCH worktree=$WT_REL"

python3 "$SCRIPT_DIR/lib/git_worktree_guard.py" check-branch "$BRANCH" --agent "$AGENT" --worktree "$WT_ABS" || true
# check-branch fails if in use; for brand-new names it should pass
if ! python3 "$SCRIPT_DIR/lib/git_worktree_guard.py" check-branch "$BRANCH" --agent "$AGENT"; then
  echo "ERROR: allocated branch unexpectedly in use" >&2
  exit 1
fi

if [[ -e "$WT_ABS" ]]; then
  echo "Worktree path already exists: $WT_ABS"
  echo "Refusing to overwrite. Use it as-is or choose another --purpose."
  exit 1
fi

BASE_REF="${BASE:-HEAD}"
# Create new branch from base without checking base out in this worktree if base is busy:
# use git worktree add -b which creates branch from start-point commit
START="$(git -C "$ROOT" rev-parse "$BASE_REF")"
git -C "$ROOT" worktree add -b "$BRANCH" "$WT_ABS" "$START"
echo "Created worktree $WT_ABS on $BRANCH (from $BASE_REF @ ${START:0:12})"
echo "NEXT: cd \"$WT_ABS\" and begin work. Do not switch this worktree to protected branches."
