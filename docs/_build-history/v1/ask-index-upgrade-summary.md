# Ask Index Upgrade Summary

**Date:** 2024-12-19  
**Bundle:** Threshold Fix + State Queries

---

## 1) What Changed

### A) Semantic Search Reliability (Bug + Fallback)

**Threshold Mismatch Fix:**
- ✅ Changed `searchChunks()` default threshold from `0.7` to `0.5` (matches API route)
- ✅ Added `searchChunksWithFallback()` function that retries with lower threshold (0.4) if zero results
- ✅ Returns metadata: `thresholdUsed`, `usedFallback`

**Logging:**
- ✅ Added logs for threshold_used, used_fallback_threshold, result_count, latency_ms

### B) Ask Router + State Queries

**Intent Detection:**
- ✅ Created `lib/askRouter.ts` with keyword-based intent detection
- ✅ Routes queries to `recall_semantic` (vector search) or `state` (structured queries)
- ✅ Project name extraction from queries ("in [project_name]")
- ✅ Project disambiguation when multiple matches found

**State Query Implementation:**
- ✅ Created `lib/stateQuery.ts` for structured data queries
- ✅ Queries `tasks` and `decisions` tables directly (no embeddings)
- ✅ Time window: 7 days default, 14 days fallback
- ✅ Blocker detection: checks description for `[Blocker]` or "blocked" text, plus `priority` status
- ✅ Stale task detection: `in_progress` tasks not updated in 14+ days

**State Summary:**
- ✅ Created `lib/stateSummary.ts` with deterministic summary generation
- ✅ LLM fallback available but not used by default (cost optimization)
- ✅ Max 4-8 lines, reductive and actionable

**API Route Updates:**
- ✅ Unified response format supporting both intents
- ✅ Metadata includes: intent, scope, threshold info, result counts, time window
- ✅ Disambiguation response for ambiguous project names

**UI Updates:**
- ✅ State response rendering with sections (Current Direction, Recent Decisions, New/Changed Tasks, Blockers/Stale)
- ✅ Disambiguation UI with project selection
- ✅ Empty state logic updated to not show "No results" for state queries with data

---

## 2) Files Modified

### New Files
- `lib/askRouter.ts` - Intent detection and routing
- `lib/stateQuery.ts` - Structured state queries
- `lib/stateSummary.ts` - State summary generation

### Modified Files
- `lib/search.ts` - Fixed threshold default, added fallback function
- `app/api/search/route.ts` - Added router integration, unified response format
- `app/ask/page.tsx` - Added state response UI, disambiguation UI

---

## 3) Response Schema

### Recall Semantic Response
```json
{
  "success": true,
  "intent": "recall_semantic",
  "scope": "global",
  "results": [
    {
      "chunk_id": "uuid",
      "content": "text",
      "conversation_id": "uuid",
      "conversation_title": "string",
      "message_id": "uuid",
      "similarity": 0.75
    }
  ],
  "answer": {
    "answer": "text",
    "citations": [...],
    "followUpQuestions": [...]
  },
  "relatedContent": {...},
  "metadata": {
    "thresholdUsed": 0.5,
    "usedFallbackThreshold": false,
    "resultCountSemantic": 5,
    "resultCountTasks": 0,
    "resultCountDecisions": 0
  },
  "ask_index_run_id": "uuid"
}
```

### State Response
```json
{
  "success": true,
  "intent": "state",
  "scope": "project",
  "resolvedProjectId": "uuid",
  "stateData": {
    "stateSummary": "2 new decisions in the last 7 days. 3 tasks created or updated. 1 blocker identified.",
    "stateSummarySource": "deterministic",
    "currentDirection": "Fix Reduce Gating and Tooltip",
    "sections": {
      "newDecisions": [
        {
          "id": "uuid",
          "title": "Decision title",
          "created_at": "2024-12-19T...",
          "project_id": "uuid",
          "project_name": "Project Name"
        }
      ],
      "newOrChangedTasks": [
        {
          "id": "uuid",
          "title": "Task title",
          "status": "in_progress",
          "created_at": "2024-12-19T...",
          "updated_at": "2024-12-19T...",
          "project_id": "uuid",
          "project_name": "Project Name"
        }
      ],
      "blockersOrStale": [
        {
          "id": "uuid",
          "title": "Task title",
          "status": "in_progress",
          "updated_at": "2024-12-10T...",
          "project_id": "uuid",
          "project_name": "Project Name",
          "reason": "blocked"
        }
      ]
    },
    "timeWindowDaysUsed": 7,
    "changeDefinition": "updated_at"
  },
  "metadata": {
    "thresholdUsed": null,
    "usedFallbackThreshold": false,
    "resultCountSemantic": 0,
    "resultCountTasks": 3,
    "resultCountDecisions": 2,
    "timeWindowDaysUsed": 7,
    "changeDefinition": "updated_at"
  },
  "ask_index_run_id": "uuid"
}
```

### Disambiguation Response
```json
{
  "success": true,
  "intent": "state",
  "needsDisambiguation": true,
  "candidateProjects": [
    {
      "id": "uuid",
      "name": "Project A"
    },
    {
      "id": "uuid",
      "name": "Project B"
    }
  ]
}
```

---

## 4) Manual Test Checklist

### ✅ Semantic Search (Recall)
1. **Query:** "Where did we decide pricing?"
   - ✅ Should return semantic search results
   - ✅ Should synthesize answer if results exist
   - ✅ Should show evidence drawer
   - ✅ Check logs: `intent: recall_semantic`

2. **Query with low similarity:** "xyzabc123" (random text)
   - ✅ Should retry with fallback threshold (0.4)
   - ✅ Check logs: `usedFallbackThreshold: true`
   - ✅ Should return empty if still no matches

### ✅ State Queries (Global)
3. **Query:** "What's new?"
   - ✅ Should detect `intent: state`
   - ✅ Should return state data (decisions, tasks)
   - ✅ Should show state summary
   - ✅ Should NOT show "No results" if state data exists
   - ✅ Check logs: `intent: state, scope: global`

4. **Query:** "What changed in my projects?"
   - ✅ Should detect `intent: state`
   - ✅ Should query tasks/decisions with `updated_at` in last 7 days
   - ✅ Should show sections: Recent Decisions, New/Changed Tasks

5. **Query:** "Any current blockers?"
   - ✅ Should detect `intent: state`
   - ✅ Should return tasks with `[Blocker]` in description or `priority` status
   - ✅ Should show "Blockers or Stale Tasks" section
   - ✅ Should label items as "Blocker" or "Stale"

### ✅ State Queries (Project-Scoped)
6. **Query:** "What's new in INDEX?"
   - ✅ Should extract project name "INDEX"
   - ✅ Should resolve to project ID
   - ✅ Should return project-scoped state
   - ✅ Should show "Current Direction" if recent decision exists
   - ✅ Check logs: `scope: project, resolvedProjectId: <uuid>`

7. **Query with ambiguous project:** "What's new in test?"
   - ✅ Should show disambiguation UI if multiple projects match
   - ✅ Should list candidate projects (max 5)
   - ✅ Clicking project should re-query with resolved project

### ✅ Edge Cases
8. **Query with no data:** "What's new?" (user has no recent activity)
   - ✅ Should return empty state sections
   - ✅ Should show "No changes in the last 7 days" message
   - ✅ Should NOT show "No results" error

9. **Query with fallback time window:** "What's new?" (no activity in 7 days, but activity in 14)
   - ✅ Should retry with 14-day window
   - ✅ Should return results from 14-day window
   - ✅ Check metadata: `timeWindowDaysUsed: 14`

10. **Mixed query:** "What did we decide about pricing?"
   - ✅ Should route to `recall_semantic` (no state keywords)
   - ✅ Should use semantic search
   - ✅ Should NOT query tasks/decisions tables

---

## 5) Implementation Notes

### Threshold Behavior
- **Primary threshold:** 0.5 (used first)
- **Fallback threshold:** 0.4 (used if zero results at 0.5)
- **No further fallback:** System returns empty if fallback also yields zero results

### State Query Limits
- **Decisions:** Max 5
- **Tasks:** Max 7
- **Blockers/Stale:** Max 5
- **Projects referenced (global):** Max 5

### Time Windows
- **Default:** 7 days
- **Fallback:** 14 days (if 7 days returns empty)
- **Stale threshold:** 14 days (for in_progress tasks)

### Blocker Detection
- Checks `description` for `[Blocker]` or "blocked" (case-insensitive)
- Treats `status = 'priority'` as potential blocker
- Stale: `in_progress` tasks not updated in 14+ days

### Current Direction Logic
- **Project-scoped only**
- If recent decision exists → use decision title
- Else if active task updated recently → use task title
- Else omit

---

## 6) Tracking / Analytics

### GA4 Events Updated
- `ask_index_query` now includes:
  - `intent_detected`: "state" | "recall_semantic"
  - `threshold_used`: number
  - `used_fallback_threshold`: boolean
  - `state_time_window_days_used`: number (if state query)

- `ask_index_answered` now includes:
  - `intent_detected`: "state" | "recall_semantic"
  - `scope`: "project" | "global"
  - `project_id_present`: boolean

### Database Tracking
- `ask_index_runs` table already tracks:
  - `scope`, `project_id`, `result_count`, `threshold`, `status`
- No new table needed (existing tracking sufficient)

---

## 7) Known Limitations

1. **Intent detection is keyword-based:** No LLM classification (by design for v1)
2. **Project name matching is simple:** Exact match → contains match (no fuzzy matching)
3. **State queries don't use embeddings:** Pure structured data queries
4. **No change detection:** "What changed" uses `updated_at`, not event log
5. **Stale detection is heuristic:** Based on 14-day threshold, not explicit "stale" status

---

## 8) Future Enhancements (Not Implemented)

- LLM-based intent classification (if keyword detection proves insufficient)
- Event log for true change detection
- Fuzzy project name matching
- Hybrid search (combine semantic + structured results)
- Query expansion (synonyms for state keywords)
