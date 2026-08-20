"""Filesystem anchors for Revenue OS (repo-relative, no worktree hops)."""

from __future__ import annotations

from pathlib import Path

PACKAGE = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE.parents[1]
BUSINESS = REPO_ROOT / "config" / "business"
INTEGRATION_SCHEMAS = REPO_ROOT / "docs" / "integrations" / "schemas"
REVENUE_SCHEMAS = REPO_ROOT / "docs" / "revenue-os" / "schemas"
PROPOSAL_TEMPLATES = REPO_ROOT / "templates" / "proposals"
