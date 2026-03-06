# Ask Index Diagnostic Audit

**Date:** 2024-12-19  
**Issue:** Basic queries like "What's new?" returning "No results"

---

## 1️⃣ End-to-End Flow Check

### ✅ Flow is Fully Wired

**User Query → `/api/search` endpoint**
- **File:** `app/api/search/route.ts`
- **Status:** ✅ Wired
- **Gating:** Free tier limit check (`checkAskLimit`) - 15 queries per 24h
- **Default threshold:** `0.5` (line 46)
- **Default limit:** `10` (line 51)

**→ `lib/search.ts` (vector search)**
- **File:** `lib/search.ts`
- **Status:** ✅ Wired
- **Function:** `searchChunks()`
- **Default threshold:** `0.7` (line 31) ⚠️ **MISMATCH with API default (0.5)**
- **Default limit:** `10` (line 30)
- **Method:** Tries RPC `match_chunks` first, falls back to client-side cosine similarity

**→ pgvector similarity query**
- **RPC Function:** `match_chunks()` (if exists)
- **File:** `supabase/migrations/create_match_chunks_function.sql`
- **SQL:** Uses `1 - (embedding <=> query_embedding)` for cosine similarity
- **Threshold filter:** Applied in WHERE clause (line 34)
- **Fallback:** If RPC fails, uses client-side computation (lines 76-230 in `lib/search.ts`)

**→ `lib/ai/answer.ts` (answer synthesis)**
- **File:** `lib/ai/answer.ts`
- **Status:** ✅ Wired
- **Condition:** Only runs if `results.length > 0` (line 63 in `/api/search/route.ts`)
- **Model:** `gpt-4o-mini`
- **Max tokens:** 300 for answer, 200 for conversion tiles

**→ UI rendering**
- **File:** `app/ask/page.tsx`
- **Status:** ✅ Wired
- **Empty state:** Shows when `results.length === 0 && hasSearched && !answer` (line 475)

### ⚠️ Critical Issue: Threshold Mismatch

- **API route default:** `0.5` (line 46 in `app/api/search/route.ts`)
- **searchChunks default:** `0.7` (line 31 in `lib/search.ts`)
- **UI sends:** `0.5` (line 130 in `app/ask/page.tsx`)

**Impact:** The API passes `0.5` to `searchChunks()`, which is correct, but the function signature defaults to `0.7` if not provided.

---

## 2️⃣ Embedding Health Check

### ✅ Embeddings Are Generated During Import

**Generation Points:**
1. **Quick Import:** `app/api/quick-import/route.ts` (lines 177-188)
2. **Full Import:** `app/api/import/process/route.ts` (lines 249-260)
3. **Background Jobs:** `lib/jobs/importProcessor.ts` (lines 511-622)

**Storage:**
- **Table:** `message_chunk_embeddings`
- **Column:** `embedding` (type: `vector(1536)`)
- **Model:** `text-embedding-3-small` (1536 dimensions)
- **File:** `lib/ai/embeddings.ts` (line 9)

**Index:**
- **RPC function:** Uses pgvector cosine distance operator `<=>`
- **Index existence:** Not explicitly checked in code, but RPC function assumes it exists

**Query Pattern:**
```sql
SELECT
  mc.id as chunk_id,
  mc.content,
  mc.conversation_id,
  c.title as conversation_title,
  mc.message_id,
  1 - (mce.embedding <=> query_embedding) as similarity
FROM message_chunk_embeddings mce
JOIN message_chunks mc ON mce.chunk_id = mc.id
JOIN conversations c ON mc.conversation_id = c.id
WHERE mc.user_id = $user_id
  AND (1 - (mce.embedding <=> query_embedding)) >= $threshold
ORDER BY similarity DESC
LIMIT $limit;
```

**Similarity Threshold:**
- **Current:** `0.5` (from API route, passed to search)
- **No fallback:** If zero results above threshold, system returns empty array

**Default Limit:**
- **API:** `10` results
- **searchChunks:** `10` results

---

## 3️⃣ Why Basic Queries Return No Results

### ❌ System Relies ONLY on Semantic Similarity

**Current Architecture:**
- **A) Semantic similarity to chunk text:** ✅ YES - This is the ONLY method
- **B) Intent-based logic (tasks, decisions, status signals):** ❌ NO - Not implemented

**Query Analysis:**

**"What's new?"**
- **Problem:** Requires temporal awareness + semantic matching
- **Current behavior:** Searches for chunks containing words/phrases semantically similar to "what's new"
- **Why it fails:** 
  - Conversations may not contain literal "what's new" phrases
  - No temporal filtering (recent vs. old)
  - No status-based filtering (new tasks, recent decisions)

**"What changed in my projects?"**
- **Problem:** Requires change detection + project scoping
- **Current behavior:** Semantic search across all conversations
- **Why it fails:**
  - No change detection logic
  - No comparison of "before" vs. "after" states
  - No project-level change aggregation

**"Are there any current blockers?"**
- **Problem:** Requires status/tag recognition
- **Current behavior:** Semantic search for "blocker" text
- **Why it fails:**
  - Relies on conversations containing word "blocker"
  - No structured data query (tasks with `status='blocked'` or `description LIKE '%[Blocker]%'`)
  - No metadata filtering

### ❗ System Cannot Answer These Queries by Design

**Root Cause:**
Ask Index is a **pure semantic search** system. It:
1. Embeds query text
2. Finds conversation chunks with similar embeddings
3. Synthesizes answer from top matches

**Missing Capabilities:**
- ❌ Temporal queries ("new", "recent", "changed")
- ❌ Status-based queries ("blockers", "open", "resolved")
- ❌ Structured data queries (tasks, decisions, highlights)
- ❌ Change detection (what changed since X)
- ❌ Intent classification (query type → different search strategy)

---

## 4️⃣ Scope + Filtering Logic

### ✅ Filtering is Implemented

**project_id filtering:**
- **Location:** `lib/search.ts` lines 79-93
- **Method:** If `projectId` provided, fetches conversation IDs from `project_conversations` table
- **RPC function:** Lines 35-42 in `create_match_chunks_function.sql` use EXISTS subquery

**user_id filtering:**
- **Location:** Always applied
- **RPC function:** Line 33 in `create_match_chunks_function.sql`
- **Fallback:** Line 105 in `lib/search.ts`

**similarity threshold:**
- **Applied:** ✅ In WHERE clause (RPC) or client-side filter (fallback)
- **Fallback behavior:** ❌ **NO** - If zero results above threshold, returns empty array
- **No retry logic:** System does NOT retry with lower threshold if no results found

**Results capping:**
- **Before synthesis:** ✅ Yes - Limited to top 5 results for answer synthesis (line 47 in `lib/ai/answer.ts`)
- **Before return:** ✅ Yes - Limited by `limit` parameter (default 10)

---

## 5️⃣ Logging + Debug Signals

### ✅ Comprehensive Logging Exists

**Console Logs:**

**In `/api/search/route.ts`:**
- `[Search API] Starting search for query:` (line 38)
- `[Search API] User ID:` (line 39)
- `[Search API] Limit:` (line 40)
- `[Search API] Threshold:` (line 41)
- `[Search API] Found X results` (line 56)
- `[Search API] Synthesizing answer...` (line 64)
- `[Search API] Answer synthesized successfully` (line 68)
- `[Search API] Ask index run recorded:` (line 106)

**In `lib/search.ts`:**
- `[Search] Starting search for user:` (line 38)
- `[Search] Query:` (line 39)
- `[Search] Generating query embedding...` (line 42)
- `[Search] Query embedding generated, length:` (line 44)
- `[Search] RPC function returned X results` (line 60)
- `[Search] RPC function error, using fallback:` (line 73)
- `[Search] Chunks query result:` (line 114)
- `[Search] Embeddings query result:` (line 133)
- `[Search] Found X embeddings for Y chunks` (line 148)
- `[Search] Final results:` (line 223) - includes `totalComputed`, `afterThreshold`, `finalReturned`, `topSimilarity`

**In `app/ask/page.tsx`:**
- `[Ask Page] Starting search for:` (line 118)
- `[Ask Page] Search response status:` (line 135)
- `[Ask Page] Search results:` (line 153) - includes `resultCount`, `hasAnswer`, `hasRelatedContent`

**Database Tracking:**
- **Table:** `ask_index_runs`
- **Fields:** `result_count`, `top_score`, `threshold`, `status` ('ok'|'no_results'|'error'), `latency_ms`
- **Location:** Lines 86-112 in `/api/search/route.ts`

---

## 6️⃣ UI State Handling

### ✅ Empty State Logic is Correct

**Condition that triggers "No results":**
```typescript
!loading && hasSearched && results.length === 0 && !answer && !error
```
**Location:** Line 475 in `app/ask/page.tsx`

**Flow:**
1. User submits query
2. `hasSearched` set to `true` (line 108)
3. API returns `results: []` if no matches above threshold
4. `answer` is `null` (because `results.length === 0` prevents synthesis - line 63 in API)
5. UI shows "No results found. Try rephrasing your query."

**Timing:**
- "No results" appears **AFTER** search completes
- **NOT** before synthesis (synthesis is skipped if `results.length === 0`)

---

## 7️⃣ Summary

### CURRENT BEHAVIOR

**What Ask Index Actually Does Today:**

1. **Pure Semantic Search:**
   - Takes user query text
   - Generates embedding using `text-embedding-3-small` (1536 dimensions)
   - Searches `message_chunk_embeddings` table for similar chunks
   - Returns top N chunks above similarity threshold (default 0.5)
   - Synthesizes answer from top 5 results using GPT-4o-mini

2. **Scope Filtering:**
   - Filters by `user_id` (always)
   - Optionally filters by `project_id` (if provided)
   - No temporal filtering
   - No status/metadata filtering

3. **Answer Synthesis:**
   - Only runs if `results.length > 0`
   - Uses top 5 results as context
   - Generates 8-12 line answer
   - Creates 1-2 conversion tiles (Decision/Task/Clarify Task)

4. **No Results Handling:**
   - If zero results above threshold → returns empty array
   - No threshold fallback
   - No alternative search strategies
   - UI shows "No results found"

---

### WHY MY QUERIES FAIL

**Technical Explanation:**

**"What's new?" / "What changed?" / "Current blockers?"**

These queries fail because:

1. **Semantic Mismatch:**
   - System searches for chunks containing text semantically similar to query
   - Conversations may not contain phrases like "what's new" or "blocker"
   - Even if they do, similarity may be below 0.5 threshold

2. **No Temporal Logic:**
   - System has no concept of "new" vs. "old"
   - No date-based filtering
   - No "recent changes" detection

3. **No Structured Data Access:**
   - System only searches conversation chunks
   - Does NOT query `tasks` table for blockers
   - Does NOT query `decisions` table for recent decisions
   - Does NOT query `highlights` table

4. **No Intent Classification:**
   - System treats all queries the same way
   - No routing to different search strategies based on query type
   - No understanding of "temporal query" vs. "status query" vs. "semantic query"

5. **Threshold Too High (Potentially):**
   - Default threshold 0.5 may filter out relevant but not highly similar matches
   - No fallback to lower threshold if zero results

---

### WHAT WOULD NEED TO CHANGE

**Architectural Gaps (Do NOT Implement Yet):**

1. **Intent Classification Layer:**
   - Add query intent detection (temporal, status, semantic, structured)
   - Route to appropriate search strategy based on intent

2. **Temporal Query Support:**
   - Add date-based filtering to search
   - Track "last searched" or "last viewed" timestamps
   - Compare conversation `created_at` / `updated_at` to detect "new"

3. **Structured Data Integration:**
   - Query `tasks` table for status-based queries ("blockers", "open tasks")
   - Query `decisions` table for decision-related queries
   - Query `highlights` table for highlight-related queries
   - Combine structured results with semantic search results

4. **Change Detection:**
   - Track state changes (tasks created/completed, decisions made)
   - Compare current state vs. previous state
   - Surface "what changed" based on structured data, not just semantic similarity

5. **Threshold Fallback:**
   - If zero results at threshold 0.5, retry with 0.3
   - Or: return top N results regardless of threshold, but mark low-similarity results

6. **Hybrid Search:**
   - Combine semantic search (chunks) + structured search (tables)
   - Weight results based on query intent
   - Merge and deduplicate results

7. **Query Expansion:**
   - Expand "what's new" to include synonyms: "recent", "latest", "updated"
   - Expand "blockers" to include: "blocked", "stuck", "waiting"

---

## Recommendations

**Immediate Fixes (Low Effort):**
1. Fix threshold mismatch (API 0.5 vs. searchChunks default 0.7)
2. Add threshold fallback (retry with 0.3 if zero results at 0.5)
3. Lower default threshold to 0.4 for better recall

**Medium-Term Enhancements:**
1. Add structured data queries for status-based queries
2. Add temporal filtering for "new" / "recent" queries
3. Add query intent classification

**Long-Term Architecture:**
1. Hybrid search system (semantic + structured)
2. Change detection and state tracking
3. Query expansion and synonym handling
