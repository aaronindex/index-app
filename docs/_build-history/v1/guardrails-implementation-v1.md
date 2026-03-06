# INDEX Guardrails Implementation v1 — Report

## 1) Summary of Changes

**Guardrails enforced/added:**
- ✅ **Import limits re-enabled**: Free users limited to 3 imports per 24h (was disabled in alpha)
- ✅ **Conversation size guardrail**: Max 100,000 characters per conversation (configurable via `MAX_IMPORT_CONVERSATION_CHARS`)
- ✅ **Digest limit enforcement**: Free users limited to 4 digests per 30 days, Pro users to 30 (was defined but not enforced)
- ✅ **Digest input caps**: Prompt budget (35,000 chars), max conversations (10), max excerpt per conversation (2,500 chars), max output tokens (1,600)
- ✅ **Email send limits**: Free users 2 per 24h, Pro users 10 per 24h
- ✅ **Email cooldown**: 60-minute cooldown between sending the same digest
- ✅ **OpenAI timeouts**: 25s default for chat completions, 30s for embeddings (configurable)
- ✅ **Pro abuse ceilings**: Ask Index (200/24h), Meaning objects (500/24h), Digests (30/30d)

**Behavior changes:**
- Import routes now reject conversations exceeding size limit (400 error)
- Digest generation now caps input conversations and truncates prompts to budget
- Email sending now rate-limited and enforces cooldown (429 errors)
- All OpenAI API calls now have timeout protection (throws timeout error after limit)
- Pro users now have finite (but very high) limits instead of unlimited

---

## 2) Diff Map

| File | Changes |
|------|---------|
| `lib/limits.ts` | Added `checkDigestLimit()`, `checkEmailSendLimit()`, `checkDigestEmailCooldown()`, `checkConversationSize()`. Updated `checkImportLimit()` to re-enable enforcement. Added Pro abuse ceilings to `checkAskLimit()` and `checkMeaningObjectLimit()`. Extended `incrementLimit()` to support `email_send`. Added new env-backed constants for all limits. Exported `IMPORT_SIZE_LIMITS` and `DIGEST_LIMITS` constants. |
| `lib/ai/request.ts` | **New file**: Created OpenAI request wrapper with `AbortController`-based timeout support. Exports `openaiRequest()` (25s default) and `openaiEmbeddingRequest()` (30s default). |
| `app/api/quick-import/route.ts` | Added `checkConversationSize()` call before processing. Returns 400 if conversation exceeds size limit. |
| `app/api/import/process/route.ts` | Added per-conversation size check in loop. Returns 400 if any conversation exceeds size limit. |
| `app/api/digests/generate/route.ts` | Added `checkDigestLimit()` enforcement (429 if exceeded). Capped conversation query to `DIGEST_LIMITS.maxConversations`. |
| `app/api/digests/[id]/send-email/route.ts` | Added `checkEmailSendLimit()` and `checkDigestEmailCooldown()` enforcement (429 if exceeded). Added `incrementLimit()` call after successful send. |
| `lib/ai/digest.ts` | Added input caps: conversations capped to `DIGEST_LIMITS.maxConversations`, per-conversation excerpts capped to `DIGEST_LIMITS.maxConvoExcerptChars`, prompt truncated to `DIGEST_LIMITS.promptBudgetChars`. Added `max_tokens: DIGEST_LIMITS.maxOutputTokens` to LLM call. Replaced `fetch()` with `openaiRequest()`. |
| `lib/ai/answer.ts` | Replaced both `fetch()` calls with `openaiRequest()` for answer synthesis and conversion tiles. |
| `lib/ai/insights.ts` | Replaced `fetch()` with `openaiRequest()` for insight extraction. |
| `lib/ai/title.ts` | Replaced OpenAI SDK client with `openaiRequest()` fetch wrapper. |
| `lib/ai/tagging.ts` | Replaced OpenAI SDK client with `openaiRequest()` fetch wrapper. |
| `lib/ai/embeddings.ts` | Replaced `fetch()` calls with `openaiEmbeddingRequest()` for both single and batch embeddings. |
| `supabase/migrations/add_email_send_limit_tracking.sql` | **New migration**: Adds `email_send_count_24h` column to `profiles` table. |

---

## 3) New/Updated Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_IMPORT_CONVERSATION_CHARS` | `100000` | Maximum characters allowed per imported conversation |
| `DIGEST_PROMPT_BUDGET_CHARS` | `35000` | Maximum characters for digest generation prompt |
| `DIGEST_MAX_CONVERSATIONS` | `10` | Maximum conversations included in digest generation |
| `DIGEST_MAX_CONVO_EXCERPT_CHARS` | `2500` | Maximum characters per conversation excerpt in digest |
| `DIGEST_MAX_OUTPUT_TOKENS` | `1600` | Maximum output tokens for digest LLM response |
| `FREE_MAX_EMAIL_SEND_PER_24H` | `2` | Free user email send limit per 24 hours |
| `PRO_MAX_EMAIL_SEND_PER_24H` | `10` | Pro user email send limit per 24 hours |
| `DIGEST_EMAIL_COOLDOWN_MINUTES` | `60` | Minutes to wait before re-sending same digest |
| `PRO_MAX_ASK_PER_24H` | `200` | Pro user Ask Index abuse ceiling per 24 hours |
| `PRO_MAX_MEANING_OBJECTS_PER_24H` | `500` | Pro user meaning objects abuse ceiling per 24 hours |
| `PRO_MAX_DIGEST_PER_30D` | `30` | Pro user digest generation abuse ceiling per 30 days |
| `OPENAI_TIMEOUT_MS` | `25000` | Timeout for OpenAI chat completion requests (ms) |
| `OPENAI_EMBED_TIMEOUT_MS` | `30000` | Timeout for OpenAI embedding requests (ms) |

**Existing variables (unchanged):**
- `FREE_MAX_ACTIVE_PROJECTS` (default: 1)
- `FREE_MAX_ASK_PER_24H` (default: 15)
- `FREE_MAX_DIGEST_PER_30D` (default: 4)
- `FREE_ASSET_UPLOADS_ENABLED` (default: false)
- `FREE_IMPORT_MODE` (default: 'quick_only')

---

## 4) Endpoint-by-Endpoint Enforcement Notes

### Import Routes

**`POST /api/quick-import`**
- **Limit enforced**: `checkImportLimit()` (3 per 24h for free)
- **Size check**: `checkConversationSize()` (100k chars max)
- **When exceeded**: 
  - Import limit: 429 status, `{ error: "Import limit reached. You can import 3 files per 24 hours." }`
  - Size limit: 400 status, `{ error: "Conversation too large (X characters). Maximum allowed: 100,000 characters." }`

**`POST /api/import/process`**
- **Limit enforced**: `checkImportLimit()` (3 per 24h for free)
- **Size check**: Per-conversation `checkConversationSize()` in loop (100k chars max per conversation)
- **When exceeded**:
  - Import limit: 429 status, `{ error: "Import limit reached. You can import 3 files per 24 hours." }`
  - Size limit: 400 status, `{ error: "Conversation \"[title]\" is too large" }`

### Reduce Route

**`POST /api/insights/extract`**
- **Limit enforced**: None (gated by meaning object limit: 20/24h free, 500/24h pro)
- **Timeout**: 25s via `openaiRequest()`
- **When timeout**: Throws error with message `"OpenAI API request timed out after 25000ms"`

### Search/Ask Route

**`POST /api/search`**
- **Limit enforced**: `checkAskLimit()` (15 per 24h free, 200 per 24h pro)
- **Timeout**: 25s via `openaiRequest()` (for answer synthesis)
- **When exceeded**: 429 status, `{ error: "Ask Index limit reached. You can make X queries per 24 hours.", limitReached: true, source: 'paywall_ask_limit' }`
- **When timeout**: Throws error, caught and returned as 500

### Digest Generate Route

**`POST /api/digests/generate`**
- **Limit enforced**: `checkDigestLimit()` (4 per 30d free, 30 per 30d pro)
- **Input caps**: Conversations capped to 10, excerpts to 2,500 chars, prompt to 35,000 chars
- **Output cap**: `max_tokens: 1600`
- **Timeout**: 25s via `openaiRequest()`
- **When exceeded**: 429 status, `{ error: "Digest limit reached. [Free/Pro] users can generate X digests per 30 days." }`
- **When timeout**: Throws error, caught and returned as 500

### Digest Send Email Route

**`POST /api/digests/[id]/send-email`**
- **Limit enforced**: `checkEmailSendLimit()` (2 per 24h free, 10 per 24h pro)
- **Cooldown enforced**: `checkDigestEmailCooldown()` (60 minutes)
- **When exceeded**: 
  - Email limit: 429 status, `{ error: "Email send limit reached. [Free/Pro] users can send X emails per 24 hours." }`
  - Cooldown: 429 status, `{ error: "Please wait X more minute(s) before sending this digest again." }`

---

## 5) Manual Verification Checklist

### Import Limits
- [ ] **Free user import limit**: Create free user → import 3 conversations → 4th import should return 429 with error message
- [ ] **Conversation size limit**: Try importing conversation > 100k chars → should return 400 with size error
- [ ] **Pro user import**: Pro user should be able to import beyond 3 (effectively unlimited for normal use)

### Digest Limits
- [ ] **Free user digest limit**: Create free user → generate 4 digests in 30 days → 5th should return 429
- [ ] **Digest input caps**: Generate digest with > 10 conversations → should only include top 10 (most recent)
- [ ] **Digest prompt truncation**: Generate digest with very large conversations → prompt should be truncated to 35k chars
- [ ] **Pro user digest limit**: Pro user should be able to generate up to 30 digests per 30 days

### Email Send Limits
- [ ] **Free user email limit**: Free user → send 2 digest emails → 3rd should return 429
- [ ] **Email cooldown**: Send same digest email → immediately try again → should return 429 with cooldown message
- [ ] **Cooldown expiration**: Send digest email → wait 61 minutes → should allow re-send

### OpenAI Timeouts
- [ ] **Answer synthesis timeout**: Simulate slow OpenAI response (or use network throttling) → should timeout after 25s
- [ ] **Embedding timeout**: Simulate slow embedding response → should timeout after 30s
- [ ] **Timeout error handling**: Verify timeout errors are caught and return appropriate error messages

### Pro Abuse Ceilings
- [ ] **Pro Ask Index ceiling**: Pro user → make 200 Ask queries → 201st should return 429
- [ ] **Pro meaning objects ceiling**: Pro user → create 500 meaning objects → 501st should return 429
- [ ] **Pro digest ceiling**: Pro user → generate 30 digests → 31st should return 429

### Edge Cases
- [ ] **24-hour reset**: Verify limits reset after 24 hours (check `limits_reset_at` logic)
- [ ] **30-day digest window**: Verify digest limit counts digests from last 30 days, not calendar month
- [ ] **Multiple conversations in import**: Verify size check applies per-conversation, not total
- [ ] **Digest with no conversations**: Should still work (returns fallback digest)

---

## Database Migration Required

**File**: `supabase/migrations/add_email_send_limit_tracking.sql`

**Action**: Run migration to add `email_send_count_24h` column to `profiles` table.

**Command** (if using Supabase CLI):
```bash
supabase migration up
```

Or apply manually via Supabase dashboard SQL editor.

---

## Notes

- All limits are enforced server-side only (no client-side checks)
- Error messages follow existing API response patterns
- Timeout errors are caught and returned as 500 status (could be improved to 504 in future)
- Pro abuse ceilings are intentionally very high to remain effectively unlimited for normal use
- Digest input caps are applied deterministically (most recent conversations first)
- Email cooldown is per-digest (can send different digests immediately)
