# Atlas Project Duplicate Review

- Generated: 2026-07-22T20:20:00Z
- Status: **No Production archives/merges executed.** Owner approval required for Lien Partners merge.

## Lien Partners Engagement (exact duplicate)

| Field | Bootstrap row | Client 360 row |
|---|---|---|
| Project ID | `7854a61a-488a-4e16-9cf6-dc870bda4a1c` | `8523b3a2-65c0-4f52-8935-62b02fe59278` |
| Client shown | `Lienpartners` | `Lien Partners` |
| Client ID | *(none)* | `client-lien01` |
| Origin | `KNOWN_PROJECTS` bootstrap | `findOrCreateClientProject` |
| Tasks | 1 bootstrap placeholder | 2 Client 360–derived tasks |
| Milestones | Scope confirmed + Next deliverable | none |
| Due | 2026-09-20 (addDays 60) | 2026-09-05 (addDays 45) |
| Classification | **Exact duplicate** of same engagement | **Keep** (canonical client link) |

### Why matching failed

Populate matches on exact `clientName` or tag `client360:{id}`. Bootstrap stored `clientName: "Lienpartners"` (no space) while Client 360 uses `Lien Partners`, so a second project was created.

### Recommended merge (requires Manny approval)

1. Keep `8523b3a2-…` (Client 360–linked).
2. Move any unique milestones/notes from `7854a61a-…` if desired (optional; currently only placeholder milestones).
3. Soft-archive `7854a61a-…` with audit note `duplicate_of:8523b3a2-…`.
4. Do **not** hard-delete.

### Choices for Manny

| Choice | Risk |
|---|---|
| A. Archive bootstrap row; keep C360 row | Low — preserves client link and C360 tasks |
| B. Keep both as separate engagements | Medium — ongoing duplicate UI noise |
| C. Archive C360 row; keep bootstrap | High — loses `client-lien01` linkage |

## Prodigy Games LLC

| Finding | Evidence |
|---|---|
| Single portfolio row | `8b0ce54b-0671-47ca-bdab-5828e8ee95b8` |
| Canonical client | `client-pdg01` |
| Classification | **Legitimate separate engagement** (one) |
| Note | Seeded defaults still apply; not a duplicate |

## That's Kava LLC

| Finding | Evidence |
|---|---|
| Single portfolio row | `57e54146-1dbb-4f14-b5e7-a85dd4a7543f` |
| Canonical client | `client-kava01` |
| Classification | **Legitimate** (one) |

## Gnieski Engagement

| Finding | Evidence |
|---|---|
| Portfolio row | `e6b14d5e-9f66-4180-8f52-4d9530625fe9` |
| Client ID on project | *(none)* |
| Client 360 | Prospect `f1458619-f6ce-4349-acb7-8784e4617a98` “Gnieski” |
| Classification | **Ambiguous** — bootstrap initiative vs prospect client |

## Other same-name checks

No other exact duplicate project names in the 22-row set.

HVCG internal projects share client name `High Value Capital Group` but are **legitimate separate initiatives** (different objectives/types).
