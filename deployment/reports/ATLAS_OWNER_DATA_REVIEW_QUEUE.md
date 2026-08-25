# Atlas Owner Data Review Queue

Only items that require Manny’s business judgment. No automatic archives/merges performed.

## 1. Lien Partners — exact duplicate merge

| Field | Value |
|---|---|
| Records | `Lien Partners Engagement` |
| IDs | Keep `8523b3a2-65c0-4f52-8935-62b02fe59278`; archive candidate `7854a61a-488a-4e16-9cf6-dc870bda4a1c` |
| Issue | Same engagement created twice (bootstrap name `Lienpartners` vs Client 360 `Lien Partners`) |
| Evidence | Inventory + duplicate review; C360 row has `client-lien01` + realer tasks |
| Recommended action | **Choice A** — soft-archive bootstrap row after confirm |
| Choices | A keep C360 / B keep both / C keep bootstrap |
| Risk | A low; B ongoing noise; C loses canonical client link |

## 2. Gnieski Engagement — link or archive?

| Field | Value |
|---|---|
| Record | `Gnieski Engagement` `e6b14d5e-9f66-4180-8f52-4d9530625fe9` |
| Issue | Bootstrap project with no `clientId`; Client 360 has prospect `f1458619-…` |
| Recommended action | Link to prospect **or** confirm as real engagement **or** archive if not operating |
| Choices | Link / Keep unlinked / Archive |
| Risk | Wrong link pollutes Client 360; archive hides real work |

## 3. LoanSpark Engagement — real or seeded?

| Field | Value |
|---|---|
| Record | `LoanSpark Engagement` `3bc0d0ad-5c4a-4191-898d-3fd1e5c02cee` |
| Issue | Bootstrap-only; no canonical Client 360 ID |
| Recommended action | Confirm whether this is an active capital engagement |
| Choices | Keep + link client / Keep internal / Archive |
| Risk | False active work if archived wrongly |

## 4. Falk PHL — client link

| Field | Value |
|---|---|
| Record | `Falk PHL Hardship & Cash Surrender` `201307e8-…` |
| Issue | No `clientId`; Client 360 has `client-cfalk01` “Christie Falk” (may or may not be the same matter) |
| Recommended action | Confirm correct client relationship before linking |
| Choices | Link `client-cfalk01` / Different client / Leave unlinked |
| Risk | Wrong client association |

## 5. Personal projects in Production portfolio

| Field | Value |
|---|---|
| Records | `Personal Gmail Archive` `af5608df-…`; `Comics Identification App` `60c968cc-…` |
| Issue | Personal/someday items seeded into Production operating portfolio |
| Recommended action | Keep visible, move to personal workspace filter, or archive from active portfolio |
| Choices | Keep / Filter-only / Archive from active |
| Risk | Low operational; clarity for daily Command Center |

## 6. Seeded defaults across 20+ projects

| Field | Value |
|---|---|
| Issue | Health `healthy`, milestone `Scope confirmed`, next action `Define next action — …`, due `2026-09-20` are bootstrap fallbacks |
| Recommended action | Accept UI honesty fix (Not assessed / No due date / Next action required) without inventing new facts; owner later sets real values per project |
| Choices | Accept display fix only / Manually set real values now |
| Risk | Display fix is safe; inventing replacements is not |
