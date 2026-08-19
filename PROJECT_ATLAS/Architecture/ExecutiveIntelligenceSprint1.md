# Architecture — Executive Intelligence Sprint 1

**Status:** Implemented (product build)  
**Branch:** `cursor/executive-intelligence-sprint1`  
**App:** `apps/hvcg-executive-command-center`

## Purpose

Turn Project Atlas and approved subsystem signals into concise executive intelligence so leaders can see, within minutes: what changed, what matters, what is at risk, what is working, what decisions are required, and what should happen next.

## Surfaces

| Route | Purpose |
|-------|---------|
| `/intelligence` | Daily HVCG Executive Brief + priority insights |
| `/intelligence/weekly` | Weekly executive briefing |
| `/intelligence/decisions` | Priority decisions + converted tasks |
| `/intelligence/exceptions` | Overdue / project / client / revenue / capital / finance |
| `/intelligence/meetings` | Upcoming meetings and deadlines |
| `/intelligence/ccb` | Colorado Craft Beef meeting-ready briefing |

## Components

- `ExecutiveBrief` — 10-section brief with evidence badges, generation time, expandable source records  
- `InsightCard` — Accept / Dismiss / Convert to decision / Convert to task  
- `DecisionQueue` / `TaskQueue` / `ReviewHistoryPanel` — decision + task workflows with preserved history  
- `prioritize.ts` — business-impact scoring  
- `briefBuilder.ts` — HVCG daily/weekly + CCB meeting briefs  

## Data contract

Insights and briefs ground to `SourceRecord` objects. Colorado Craft Beef uses verified relationship facts only; financial KPIs remain pending verification with no invented dollars.

## Permissions

Owner / Executive / Advisor / Operations / Finance may access intelligence (content still role-filtered). Assistant cannot access `/intelligence`.
