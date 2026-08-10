# Phase 4B-1 Naming Policy

## Pattern (configurable heuristic)

`{Client}_{YYYY-MM-DD}_{DocumentType}_{CounterpartyOrProject}_{Version}_{Status}.ext`

Missing elements are listed; placeholders may appear (e.g. `Undated`, `unknown`).

## Response

- `originalFilename`
- `proposedFilename`
- `reason`
- `missingNamingElements`
- `collisionOrDuplicateWarning`
- `fileRenamed: false` **always**

The workflow **never** renames the staged or original file.
