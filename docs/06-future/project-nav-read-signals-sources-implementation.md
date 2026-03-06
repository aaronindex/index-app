# Project nav: Read / Signals / Sources — Implementation summary

## Summary

Project-level navigation is now three tabs: **Read**, **Signals**, **Sources**. Decisions and Tasks are no longer top-level tabs; they appear as sections inside the single **Signals** surface.

---

## Files changed

### Nav and routing
- **app/projects/[id]/components/ProjectTabs.tsx** — Tabs reduced to Read, Signals, Sources. Type `Tab = 'read' | 'signals' | 'chats'`.
- **app/projects/[id]/page.tsx** — Redirect `tab=decisions` and `tab=tasks` to `tab=signals`. Accept `tab=signals`; when `tab=signals`, fetch decisions, tasks, and highlights. Added `highlightsData` and `is_inactive` to decisions/tasks mapping. `activeTab` is `'read' | 'signals' | 'chats'`. Render `SignalsTab` when `activeTab === 'signals'` (removed direct render of `DecisionsTab` / `TasksTab` as separate tab content).

### Signals surface
- **app/projects/[id]/components/SignalsTab.tsx** — **NEW.** Composes `DecisionsTab`, `TasksTab`, and `HighlightsTab` in one page in order: Decisions, Tasks, Highlights. Uses existing tab components so lifecycle actions (resolve/invalidate/supersede, task status, toggle inactive, delete) and task attributes (Commitment/Blocker/Open Loop) are unchanged.

### Links to Signals
- **app/projects/[id]/components/ReadTab.tsx** — "View all decisions" and "View all tasks" (and item links) now point to `/projects/${projectId}?tab=signals` (and `#${id}` where applicable). Removed invalid `/projects/…/decisions` and `/projects/…/tasks` path segments.
- **app/projects/[id]/components/WhatChangedThisWeek.tsx** — Decision and task links updated from `?tab=decisions` / `?tab=tasks` to `?tab=signals`.
- **app/ask/page.tsx** — Decision and task links updated to `/projects/${id}?tab=signals#${id}`.
- **app/conversations/[id]/components/CreateTaskFromHighlightButton.tsx** — After creating task from highlight, redirect to `?tab=signals` instead of `?tab=tasks`.

---

## Assumptions

- **Read** — Unchanged. Still shows snapshot, direction, timeline, record result, still unfolding, etc. No content moved from Read to Signals or Sources.
- **Signals** — Single surface with three sections. No new unified query; reuses existing decisions/tasks/highlights queries when `tab=signals`. Results (project_outcome) stay on Read (Record Result); not added to Signals in this pass.
- **Sources** — ChatsTab unchanged. Copy already frames sources as input ("Sources are the raw material…", "Import sources"). No copy changes in this pass.
- **Lifecycle** — DecisionsTab and TasksTab are unchanged; they still provide ToggleInactiveButton, DeleteDecisionButton, DeleteTaskButton, etc. Phase 2a resolve/invalidate/supersede are API-only; UI still uses toggle-inactive where wired. Task status and Commitment/Blocker/Open Loop labels remain as in TasksTab.
- **Highlights** — Still labeled "Highlights" (not renamed to Insights). HighlightsTab receives `status: null` from the new highlights fetch (highlights table has no status column).

---

## Import path sanity check

- **`/import`** — Full import page. On success, user is redirected to the imported conversation (source detail) to distill. Fits **Sources → Distill → Signals → Read**. No change in this pass.
- **`/import?project=...`** — Same with project pre-selected. Used from ChatsTab and ReadTab. After import, redirect to conversation. Coherent.
- **`/capture/quick`** — Quick capture page (e.g. extension). Renders QuickCaptureForm; post-capture behavior is unchanged. No inconsistency with Read / Signals / Sources; capture adds source material, which is then distilled from Sources.

No minimal fixes were required for these flows; they already land in sensible places.

---

## Remaining references to old tab names

- **URLs** — Old bookmarks or links with `?tab=decisions` or `?tab=tasks` are redirected to `?tab=signals` by the project page.
- **Path segments** — There are no routes at `/projects/[id]/decisions` or `/projects/[id]/tasks`; all project content is under `/projects/[id]?tab=...`. Updated links use `?tab=signals` only.
