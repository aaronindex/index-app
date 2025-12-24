# Testing Guide: Start Chat Refactoring

## Overview
Start Chat has been refactored to align with INDEX's branchless, project-centric architecture. It's now a bounded escape hatch for external AI reasoning, not a chat interface.

## Key Changes to Test

### 1. Project-Level Start Chat ("Resume Deliberate Thinking")

**Location:** Project detail page → Tools section

**Test Steps:**
1. Navigate to a project with some data (tasks, decisions, highlights, conversations)
2. Find "Resume Deliberate Thinking" section
3. **Intent Selection:**
   - Select different intents from dropdown (e.g., "Decide between options", "Generate next concrete actions")
   - Try "Custom intent..." option and enter your own intent
   - Verify intent is required (button should be disabled without selection)
4. **Target Tool Selection:**
   - Select different tools (ChatGPT, Claude, Cursor, Other)
5. **Generate Continuity Packet:**
   - Click "Generate Continuity Packet"
   - Wait for generation (should be fast, deterministic)
   - Verify prompt structure includes:
     - Continuity Intent
     - Non-Negotiable Constraints
     - Named Concepts & Shorthand
     - Current Direction of Travel
     - Live Tensions / Open Questions
     - Minimal State Snapshot
     - Explicit Continuation Instruction
     - Intent + Request
     - Return Contract
6. **Copy & Open:**
   - Click "View & Copy" → Modal opens
   - Click "Copy Context" → Should copy to clipboard, status updates to 'copied'
   - Click a destination button (ChatGPT/Claude/Cursor) → Opens new tab, context copied
7. **Lifecycle Tracking:**
   - After using in external tool, click "Mark Harvested" or "Abandon"
   - Verify status updates in database (optional: check `start_chat_runs` table)

**Expected Results:**
- Intent selection is required
- Prompt is structured and weighted (not raw conversation dumps)
- Prompt respects ~7k character budget
- Status tracking works (drafted → copied → harvested/abandoned)

---

### 2. Task-Level Start Chat

**Location:** Project → Tasks tab → Each task card

**Test Steps:**
1. Navigate to a project with tasks
2. Find a task with "Start Chat" button (secondary, opacity-75)
3. Click "Start Chat"
4. Verify prompt is generated (should be task-focused)
5. Modal opens with task-specific prompt
6. Test copy/open flow
7. Test harvest/abandon buttons

**Expected Results:**
- Prompt focuses on task resolution/planning/debugging
- Includes task description and related context
- No intent selection needed (task context is the intent)

---

### 3. Decision-Level Start Chat

**Location:** Project → Decisions tab → Each decision card

**Test Steps:**
1. Navigate to a project with decisions
2. Find a decision with "Start Chat" button
3. Click "Start Chat"
4. Verify prompt is generated (should be decision-focused)
5. Modal opens with decision-specific prompt
6. Test copy/open flow
7. Test harvest/abandon buttons

**Expected Results:**
- Prompt focuses on stress-testing/re-evaluating the decision
- Includes decision context
- Asks for risks, alternatives, validation steps

---

### 4. Verify Start Chat Removal

**Test that Start Chat is NOT available on:**

1. **Highlights:**
   - Go to conversation page → Highlights sidebar → No Start Chat button
   - Go to project → Highlights tab → No Start Chat button

2. **Conversations:**
   - Go to any conversation page → No Start Chat button anywhere

3. **Ask Index Results:**
   - Perform a search → Results appear → No Start Chat button on results

4. **Ask Index Follow-ups:**
   - Perform a search → See follow-up questions
   - "Start Chat (convert first)" button should be disabled/alert
   - Clicking it should show alert: "Please convert this follow-up into a Task or Decision first"

**Expected Results:**
- Start Chat only appears on Project (tool), Task, Decision
- All other surfaces have no Start Chat option

---

### 5. Continuity Packet Quality

**Test the generated prompts for:**

1. **Structure:** All 9 sections present (for project-level)
2. **Weighting:** Recent/important items prioritized
3. **Budget:** Prompt stays under ~7k characters
4. **No Raw Dumps:** No full conversation text, only excerpts when referenced by thought-objects
5. **Context Refs:** Database stores context_refs JSONB with thought-object IDs and scores

---

### 6. Database Verification (Optional)

**Check `start_chat_runs` table:**

1. After generating a prompt, verify row created with:
   - `origin_type`: 'project' | 'task' | 'decision'
   - `origin_id`: null for project, task/decision ID otherwise
   - `intent`: Intent string (for project-level)
   - `prompt_text`: Generated prompt
   - `context_refs`: JSONB array with thought-object references
   - `status`: 'drafted' initially

2. After copying/opening, verify status updates to 'copied'

3. After harvest/abandon, verify status updates to 'harvested' or 'abandoned'

---

## Quick Smoke Test (5 minutes)

1. ✅ Go to project → Generate Continuity Packet with Intent
2. ✅ Copy prompt → Verify structure
3. ✅ Go to Tasks tab → Click Start Chat on a task
4. ✅ Go to Decisions tab → Click Start Chat on a decision
5. ✅ Verify no Start Chat on Highlights/Conversations
6. ✅ Verify Ask Index follow-ups require conversion first

---

## Known Issues / Edge Cases

- **Empty Projects:** Continuity Packet should still generate (with minimal content)
- **No Tasks/Decisions:** Prompt should gracefully handle missing data
- **Unassigned Conversations:** Decisions from unassigned conversations won't have project context (expected)

---

## Success Criteria

✅ Start Chat appears ONLY on Project, Task, Decision  
✅ Project Start Chat requires Intent selection  
✅ Prompts are structured Continuity Packets (not raw dumps)  
✅ No Start Chat on Highlights, Conversations, Ask Index results  
✅ Follow-ups require conversion before Start Chat  
✅ Lifecycle tracking works (drafted → copied → harvested/abandoned)  

