# Communications — QA Handoff

**Branch:** `cursor/comms-product-timeline`  
**Worktree:** `.worktrees/track10-elite-ui`  
**Build:** Atlas Elite OS Communications module

## Deliverables checklist

| Deliverable | Location | QA check |
|-------------|----------|----------|
| Communication timeline UI | `/communications` | Filters, detail dialog, draft chips |
| CCB / Jeff Smith history | `/communications?client=ws-ccb` + Client detail card | All 8 seeded events visible |
| Outlook / Teams launch | Header buttons + row Launch | Opens microsoft.com deep links (no Atlas send) |
| Meeting / follow-up workflows | Schedule meeting, call notes, follow-up task dialogs | Toast confirms; no external send |
| Templates | Templates table + `templates/communications/*.md` | Prepare opens Outlook with `[DRAFT · NOT SENT]` |
| Notification integration | Link to `/notifications` + notification template | Teams posts still gated |
| Schema | `src/sharepoint/lists/HVCG_Communications.json` | New relationship + Status columns present |
| Permission review | `docs/communications/PERMISSIONS_REVIEW.md` | Guest blocked; Finance no external draft |
| User documentation | `docs/communications/USER_GUIDE.md` | Matches UI labels |

## Test plan

1. **Nav** — Communications appears under Executive; search finds “Communications” and “Jeff Smith”.
2. **Timeline** — Filter Colorado Craft Beef; confirm referral → HVS → HVCG meeting → Blueprint → Draft document request → Executive briefing order (newest first OK).
3. **Draft distinction** — Document-request row shows `DRAFT · Draft`; recorded meetings show `Recorded`.
4. **Launch Outlook** — Compose opens with draft banner text; calendar opens week view.
5. **Launch Teams** — Teams home / scheduling form opens; no Graph write from Atlas.
6. **Prepare template** — Client follow-up prepare → Outlook compose subject starts with `[DRAFT · NOT SENT]`.
7. **Client context** — Clients → Colorado Craft Beef shows Jeff Smith communications card + link to full timeline.
8. **Permissions** — Set `VITE_ATLAS_ROLE=Guest` → Communications shows access denied; `Finance` → Prepare on external template warns/blocked.
9. **Live send** — Confirm `blockLiveClientComms` remains true; no Graph `sendMail` calls in product code.
10. **No invented finance** — Timeline and briefing contain no dollar amounts.

## Out of scope (explicit)

- Full Outlook/Teams client duplication  
- Live Graph mailbox sync  
- Production Teams channel posts  
- Automatic external email send  

## Suggested QA verdict paths

- **Pass** if checklist 1–10 green.  
- **Fail** if drafts appear as Sent, Guest can view timeline, or any auto-send path exists.

## Contacts

- Product: Communications  
- Reviewers: QA Release, Security (permissions), Owner (OA-EXT-01 for any future live send)
