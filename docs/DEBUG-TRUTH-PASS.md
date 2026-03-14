# INDEX v2 — Debug Truth Pass

Trace of the actual runtime source-of-truth for four issues and the patches applied at the identified layers.

---

## Issue 1 — Home > Direction "Read structure" not showing

### Render path (traced)

- **File:** `app/components/MagicHomeScreen.tsx`
- **Component:** `MagicHomeScreen` (default export)
- **Direction section:** Lines 434–479. Two branches: `!directionText?.trim()` (no direction yet) and else (has direction text). In **both** branches, `<ReadStructure>` is mounted with `arc={directionArc}`, `signals={directionSignals.map(...)}`.
- **Shared component:** `app/components/ReadStructure.tsx`. It returns `null` when `!hasContent` (lines 40–41), where `hasContent = signals.length > 0 || (arc != null && arc.trim() !== '')`.

### Exact condition preventing rendering

**Read structure is hidden when:** `directionSignals.length === 0` **and** `(directionArc == null || directionArc.trim() === '')`.

So the button only appears when the server sends at least one of: `direction.signals` or a non-empty `direction.arc`. If the server fails to set `direction.arc` (e.g. throw in the Direction block) or `payload.active_arc_ids` is empty, the UI never gets content.

### Patch (render-path)

**Layer:** Client — ensure the same condition that shows “X arc(s) active” also gives Read structure something to show.

- **File:** `app/components/MagicHomeScreen.tsx`
- **Change:** Pass `arc={directionArc || (activeArcCount > 0 ? 'Current focus' : '')}` to both `<ReadStructure>` instances.
- **Effect:** Whenever `activeArcCount > 0` (status line “X arc(s) active”), Read structure gets a non-empty `arc`, so `hasContent` is true and “Read structure ▸” is visible even if the server did not send `direction.arc`.

---

## Issue 2 — Tension text truncated / sentence fragments

### Where t.left and t.right are created

- **File:** `lib/ui-data/project.load.ts`
- **Source 1 (arc pair):** `tensions.push({ left: (a?.title ?? '').trim() || 'Direction A', right: (b?.title ?? '').trim() || 'Direction B' })`.
- **Source 2 (text heuristic):** `detectTensionFromText(combinedText)` in `lib/tensionHeuristic.ts` returns `{ left, right }`; each side is produced by **`norm(capture)`**.

### Truncation

- **Generation:** In `tensionHeuristic.ts`, `norm(s)` was `stripPrefix(s).replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LEN)` (48 chars). That cuts mid-word and keeps sentence fragments.
- **Display:** `lib/tensionDisplay.ts` → `normalizeTensionText()` → `extractConceptualPhrase()` then cap at 40 chars. So truncation happened both at **source** (48-char slice) and at **display** (phrase extraction + 40 chars).

### Patch (source generation)

**Layer:** Tension **creation** — store phrase-length labels, not raw character slices.

- **File:** `lib/tensionHeuristic.ts`
- **Change:** Replaced `norm(s)` with a **phrase extractor** `toPhrase(s)`: strip prefixes, then prefer words after “focus on”, else last 3–5 words; cap at 40 chars at a **word boundary** (no `.slice(0, 48)`). `norm(s)` now returns `toPhrase(s)`.
- **Effect:** Stored `left`/`right` are short conceptual phrases (e.g. “Core loop validation”, “Feature completeness”). Display layer can remain as-is; no need to fix “only” the renderer.

---

## Issue 3 — Timeline tooltips still generic (“A shift in focus”)

### Label resolver (home)

- **File:** `lib/ui-data/home-page-data.ts`
- **Function:** `getTimelineLabel(p, semanticHeadline, snapshotTextForLatestState, latestStateHash, arcTitle)`.
- **Priority:** 1) arc title (if non-empty, not system phrase), 2) semantic/typed headline, 3) snapshot phrase when pulse matches latest state, 4) soft fallback.

Tooltip body is `item.summary`, which is exactly the return value of `getTimelineLabel(..., arcTitleByStateHash[p.state_hash])`.

### Why arc title was missing for some events

`arcTitleByStateHash` is filled only for `state_hash` values that have a row in `snapshot_state` with non-empty `active_arc_ids`. Older pulses can have a `state_hash` that no longer has a snapshot row (or has empty arcs), so `arcTitleByStateHash[p.state_hash]` is undefined and the label falls through to semantic/snapshot/generic — hence “A shift in focus”.

### Patch (timeline source)

**Layer:** Data that feeds the label resolver — give every pulse an arc title when we have **any** arc for the current/latest state.

- **File:** `lib/ui-data/home-page-data.ts`
- **Change:** Compute `latestArcTitle = arcTitleByStateHash[latestStateHash]`. For each pulse, pass `arcTitle = arcTitleByStateHash[p.state_hash] || latestArcTitle` into `getTimelineLabel` (for both shifts and timeline events).
- **File:** `lib/ui-data/project.load.ts`
- **Change:** Compute `fallbackArcTitle = Object.values(arcTitleByStateHash)[0] ?? null`. For each pulse, use `arcTitle = arcTitleByStateHash[p.state_hash] || fallbackArcTitle`.
- **Effect:** When a pulse’s own state has no arc title, the timeline still uses the current (or any) arc title instead of the generic fallback, so tooltips align with Active Arcs (e.g. “Initial phase of project development”).

---

## Issue 4 — Imported source titles generic (“User”, “Index v2 Launch Testing”)

### Where source title is set

- **Quick import:** `app/api/quick-import/route.ts`. `finalTitle = title?.trim() || deriveSourceTitleFromTranscript(transcript) || fallbackQuickCaptureTitle()`. So when the user doesn’t send a title, it comes from the **first line(s) of the raw transcript** (with prefix stripping and generic check) or the time-based fallback.
- **ChatGPT import:** `lib/parsers/chatgpt.ts` → `parseSingleConversation` → `title = conv.title || 'Untitled Conversation'`, then (after the recent change) if that title is generic we replace it with the first user message’s first line.

### Why “User” or generic titles appear

- **Quick import:** `deriveSourceTitleFromTranscript` takes the first non-empty line; if that line is “User” or “User: …”, we already strip “User:” and treat “User” as generic and return null, but we then only had `fallbackQuickCaptureTitle()` (e.g. “Quick Capture — Mar 13, 2:30 PM”). We were **not** using the **first user message content** from the parsed conversation.
- So when the first line of the transcript is useless, the title was either generic or time-based, not content-derived.

### Patch (import-time source)

**Layer:** **Import-time** title derivation — prefer content from the first user message over the raw first line when the latter is missing or generic.

- **File:** `app/api/quick-import/route.ts`
- **Change:** Added `deriveTitleFromFirstUserMessage(parsed)`: first user message, first sentence (or first ~60 chars), trim to ~52 chars at word boundary, reject if generic. Then `finalTitle = fromTranscript || fromFirstUser || fallbackQuickCaptureTitle()`.
- **Effect:** When the transcript’s first line is empty or generic, the stored source title is derived from the first user message content (e.g. “Path Selection for INDEX Launch”, “Shift Focus to Distribution”), so downstream UI gets meaningful titles instead of “User” or a bare time fallback.

---

## Verification checklist

After deploying:

1. **Homepage Direction** shows “Read structure ▸” whenever “X arc(s) active” is shown (and when there are direction signals or a non-empty arc from the server).
2. **Tension** renders as short phrase pairs (e.g. “Core loop validation vs Feature completeness”), not clipped sentences.
3. **Timeline tooltips** (home and project) use arc/source titles (e.g. “Initial phase of project development”) instead of “A shift in focus” when an arc title exists.
4. **New quick-imports** get titles derived from the first user message when the transcript first line is missing or generic, instead of “User” or only “Quick Capture — …”.
