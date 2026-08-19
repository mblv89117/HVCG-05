# Project Atlas Folder Standards

| Field | Value |
|---|---|
| Purpose | Define where Atlas knowledge belongs |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Limitation | Proposed structure; QA and Atlas owner must approve promotion |

## Canonical structure

```text
PROJECT_ATLAS/
├── README.md                 # entry point
├── PROJECT_INDEX.md          # complete navigation
├── CURRENT_STATE.md          # status SoR
├── NEXT_ACTIONS.md           # ordered work
├── Architecture/             # Atlas pointers and approved ADR summaries
├── Agents/                   # role handbooks
├── CONTINUATION/             # portable continuation workflow
├── Decisions/                # detailed approved decision records
├── Documentation/            # standards, guides, catalogs, health reports
├── Evidence/                 # evidence index; no confidential raw data
├── Handoffs/                 # immutable or superseded handoff records
├── QA/                       # QA results organized by track/sprint
├── Releases/                 # release records and release index
├── Reports/                  # reconciliations and audits
├── Screenshots/              # index/manifest; binary assets only when approved
├── Sprints/                  # one page per sprint plus index/backlog
└── Tracks/                   # one page per track plus index
```

## Placement rules

- Root contains only cross-project status, authority, indexes, ownership, release, and continuation entry points.
- `Documentation/` contains reusable guidance and documentation governance; it does not duplicate project status.
- `Architecture/` links to external architecture sources and contains only approved Atlas-specific ADRs or diagrams.
- `Evidence/` stores manifests and links. Raw client or tenant data is prohibited.
- `Handoffs/` and `Reports/` are append-only records. A newer file supersedes an older one by explicit link.
- `Archive/` contains deprecated documents with replacement pointers. Decision history is not archived away from its index.
- Proposed updates from another track remain in that track’s workspace or a `ProposedUpdates/` handoff until Atlas owner approval.

## Cross-worktree rule

Never edit another agent’s Atlas copy. A specialist track creates an interface specification or handoff. The Atlas owner promotes accepted facts into the authoritative worktree.

## Case and portability

- Folder names in existing Atlas use PascalCase; retain those names to avoid breaking links.
- New files use uppercase snake case as defined in [NAMING_STANDARDS.md](NAMING_STANDARDS.md).
- Never create names that differ only by case (`Release/` vs `RELEASE/`).
- Use repository-relative links. Absolute workstation paths may appear only as clearly labeled diagnostic evidence.

