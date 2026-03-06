# INDEX Continuity Prompt Structure — Audit Report

**Date**: Current  
**Scope**: Read-only audit of Continuity Prompt generation  
**Status**: Complete

---

## 1. ENTRY POINTS

### Primary API Endpoint
**File**: `app/api/start-chat/generate/route.ts`  
**Function**: `POST(request: NextRequest)`  
**Description**: Main entry point for generating continuity prompts. Accepts `originType` ('project' | 'task' | 'decision'), `originId`, `intent` (required for project), and `targetTool`. Routes to appropriate compiler function based on origin type.

### Compiler Functions
**File**: `lib/startChat/compiler.ts`

1. **`compileProjectContinuityPacket(projectId, userId, intent, targetTool)`**
   - **Line**: 88-330
   - **Description**: Generates full project-level continuity prompt with 9-section structure. Most comprehensive prompt type.

2. **`compileTaskStartChatPacket(taskId, userId, targetTool)`**
   - **Line**: 335-413
   - **Description**: Generates task-focused prompt. Simpler structure focused on single task resolution.

3. **`compileDecisionStartChatPacket(decisionId, userId, targetTool)`**
   - **Line**: 418-654
   - **Description**: Generates decision re-evaluation prompt. Includes related context from project.

---

## 2. PROMPT ASSEMBLY FLOW

### Project Continuity Packet Flow

**Step 1**: Fetch project data
- **Location**: `lib/startChat/compiler.ts:97-106`
- **Action**: Query `projects` table for `id`, `name`, `description`
- **Filters**: `project_id = projectId`, `user_id = userId`

**Step 2**: Collect project conversations
- **Location**: `lib/startChat/compiler.ts:109-114`
- **Action**: Query `project_conversations` to get all `conversation_id` values for project
- **Result**: Array of conversation IDs

**Step 3**: Fetch thought objects (tasks, decisions, highlights)
- **Location**: `lib/startChat/compiler.ts:117-154`
- **Tasks**: Query `tasks` table (limit 10, status: open/in_progress/priority, exclude inactive)
- **Decisions**: Query `decisions` table (limit 7, exclude inactive, filter by conversation_ids)
- **Highlights**: Query `highlights` table (limit 20, filter by conversation_ids)
- **Conversations**: Query `conversations` table (limit 5, exclude inactive, filter by conversation_ids)

**Step 4**: Fetch redactions
- **Location**: `lib/startChat/compiler.ts:157-161`
- **Action**: Query `redactions` table to get redacted conversation IDs
- **Purpose**: Filter out highlights from redacted conversations

**Step 5**: Score and rank thought objects
- **Location**: `lib/startChat/compiler.ts:163-199`
- **Function**: `calculateImportanceScore(item, type, now)` (lines 57-83)
- **Scoring factors**:
  - Recency decay: `Math.max(0, 1 - daysSinceCreation / 30)` × 0.3
  - Task status: priority (+0.4), open/in_progress (+0.2), [blocker] mention (+0.3)
  - Decision: inherent importance (+0.3)
  - Highlight: labeled (+0.2)
- **Result**: Top 5 tasks, top 5 decisions, top 5 highlights (after filtering redacted)

**Step 6**: Build context references
- **Location**: `lib/startChat/compiler.ts:201-210`
- **Action**: Create `ContextRef[]` array with scored items
- **Structure**: `{ type: 'task'|'decision'|'highlight', id: string, score: number }`

**Step 7**: Map intent to instruction text
- **Location**: `lib/startChat/compiler.ts:213`
- **Function**: `getIntentInstruction(intent)` (lines 47-55)
- **Mapping**:
  - `generate_next_actions` → "Generate concrete, immediately executable next steps that move this project forward."
  - `decide_between_options` → "Identify decisions that need to be made and present clear options with tradeoffs."
  - `resolve_blocking_uncertainty` → "Identify what is blocking progress and what must be clarified to move forward."
  - `summarize_state_propose_path` → "Summarize the current state and propose a coherent path forward."
  - Default → `Proceed with: ${intent}`

**Step 8**: Assemble prompt string (9 sections)
- **Location**: `lib/startChat/compiler.ts:216-327`
- **Sections built in order**:
  1. CONTINUITY INTENT
  2. NON-NEGOTIABLE CONSTRAINTS
  3. NAMED CONCEPTS & SHORTHAND
  4. CURRENT DIRECTION OF TRAVEL
  5. LIVE TENSIONS / OPEN QUESTIONS
  6. MINIMAL STATE SNAPSHOT
  7. EXPLICIT CONTINUATION INSTRUCTION
  8. INTENT + REQUEST
  9. RETURN CONTRACT

**Step 9**: Enforce prompt budget
- **Location**: `lib/startChat/compiler.ts:325-327`
- **Constant**: `PROMPT_BUDGET = 7000` characters (line 41)
- **Action**: If prompt exceeds budget, truncate to `PROMPT_BUDGET - 100` and append `'\n\n[Prompt truncated to budget]'`

**Step 10**: Return ContinuityPacket
- **Location**: `lib/startChat/compiler.ts:329`
- **Structure**: `{ promptText: string, contextRefs: ContextRef[] }`

### Task Start Chat Packet Flow

**Step 1**: Fetch task data
- **Location**: `lib/startChat/compiler.ts:342-352`
- **Query**: `tasks` table (single task by ID, exclude inactive)

**Step 2**: Fetch related context
- **Location**: `lib/startChat/compiler.ts:355-374`
- **Project**: If `task.project_id` exists, fetch project name
- **Highlight**: If `task.source_highlight_id` exists, fetch highlight content

**Step 3**: Build context refs
- **Location**: `lib/startChat/compiler.ts:376-379`
- **Always includes**: Task (score 1.0)
- **Conditionally includes**: Source highlight (score 0.8)

**Step 4**: Assemble prompt
- **Location**: `lib/startChat/compiler.ts:381-406`
- **Structure**:
  1. `START_CHAT_CONSTRAINTS` (from stance.ts)
  2. `TASK: ${task.title}`
  3. `Description:` (if exists)
  4. `Project:` (if exists)
  5. `Source Highlight:` (if exists, truncated to 300 chars)
  6. `INTENT: Resolve/Plan/Debug this task`
  7. Request bullets
  8. Output structure instruction

**Step 5**: Enforce budget and return
- **Location**: `lib/startChat/compiler.ts:408-412`

### Decision Start Chat Packet Flow

**Step 1**: Fetch decision data
- **Location**: `lib/startChat/compiler.ts:425-435`
- **Query**: `decisions` table (single decision by ID, exclude inactive)

**Step 2**: Resolve project context
- **Location**: `lib/startChat/compiler.ts:438-463`
- **Logic**: If no `project_id`, try to get from `project_conversations` via `conversation_id`
- **Fetch**: Project name and description

**Step 3**: Collect related context
- **Location**: `lib/startChat/compiler.ts:466-544`
- **Conversations**: Get conversation IDs from project or single conversation
- **Related Tasks**: Query tasks in project (limit 5, status: open/in_progress/priority)
- **Other Decisions**: Query other decisions in project (limit 5, exclude current decision)
- **Related Highlights**: Query highlights from conversations (limit 10)
- **Conversation Context**: If decision has `conversation_id`, fetch up to 10 messages (truncated to 200 chars each)

**Step 4**: Build context refs
- **Location**: `lib/startChat/compiler.ts:547-565`
- **Always includes**: Decision (score 1.0)
- **Conditionally includes**: Related tasks (score 0.7), other decisions (score 0.6), highlights (score 0.5)

**Step 5**: Assemble prompt
- **Location**: `lib/startChat/compiler.ts:568-646`
- **Structure**:
  1. `START_CHAT_CONSTRAINTS`
  2. `DECISION TO RE-EVALUATE`
  3. `Decision Details:` (if exists)
  4. `PROJECT CONTEXT` (if exists)
  5. `RELATED ACTIVE TASKS` (if exists)
  6. `OTHER DECISIONS IN THIS PROJECT` (if exists)
  7. `KEY HIGHLIGHTS` (if exists)
  8. `CONVERSATION CONTEXT` (if exists)
  9. `INTENT: Stress-test / Re-evaluate this decision`
  10. Request bullets
  11. Output structure instruction

**Step 6**: Enforce budget and return
- **Location**: `lib/startChat/compiler.ts:649-653`

---

## 3. RAW PROMPT TEMPLATE(S)

### Project Continuity Packet Template

```
CONTINUITY INTENT
${intent}

NON-NEGOTIABLE CONSTRAINTS
${constraints.map((c, i) => `${i + 1}. ${c}\n`).join('')}

NAMED CONCEPTS & SHORTHAND
• Branchless Model: No branch conversations; meaning objects only
• Thought-Objects: Highlights, Tasks, Decisions
• Escape Hatch: Start Chat is bounded external reasoning
${topTasks.length > 0 ? `• Active Tasks: ${topTasks.length} open/in-progress tasks in this project\n` : ''}

CURRENT DIRECTION OF TRAVEL
${directionParts.join('. ')}.

LIVE TENSIONS / OPEN QUESTIONS
${tensions.map((t, i) => `${i + 1}. ${t}\n`).join('')}

MINIMAL STATE SNAPSHOT
Project: ${project.name}
Active Tasks: ${topTasks.length}
Key Decisions: ${topDecisions.length}
Key Highlights: ${topHighlights.length}
${conversations && conversations.length > 0 ? `Recent Conversations: ${conversations.length}\n` : ''}

EXPLICIT CONTINUATION INSTRUCTION
Provide structured output that can be harvested into Tasks, Decisions, or Highlights.

INTENT + REQUEST
${continuationInstruction}

RETURN CONTRACT
Structure your response as:
- Clear answer/recommendation
- Actionable next steps (as bullet points)
- Any decisions to make (as bullet points)
- Key insights to capture (as bullet points)
```

### Task Start Chat Packet Template

```
${START_CHAT_CONSTRAINTS}

TASK: ${task.title}

${task.description ? `Description:\n${task.description}\n\n` : ''}${projectName ? `Project: ${projectName}\n\n` : ''}${highlightContent ? `Source Highlight:\n${highlightContent.substring(0, 300)}\n\n` : ''}INTENT: Resolve/Plan/Debug this task

Please help me:
- Understand what needs to be done
- Identify blockers or dependencies
- Generate concrete next steps
- Suggest any decisions that need to be made

Structure your response as actionable items that can be converted into Tasks or Decisions.
```

### Decision Start Chat Packet Template

```
${START_CHAT_CONSTRAINTS}

DECISION TO RE-EVALUATE
${decision.title}

${decision.content ? `Decision Details:\n${decision.content}\n\n` : ''}${projectName ? `PROJECT CONTEXT\nProject: ${projectName}\n${projectDescription ? `Description: ${projectDescription.substring(0, 200)}\n` : ''}\n` : ''}${relatedTasks && relatedTasks.length > 0 ? `RELATED ACTIVE TASKS\n${relatedTasks.map((task, i) => `${i + 1}. ${task.title} (${task.status})${task.description ? `: ${task.description.substring(0, 100)}` : ''}\n`).join('')}\n` : ''}${otherDecisions && otherDecisions.length > 0 ? `OTHER DECISIONS IN THIS PROJECT\n${otherDecisions.map((d, i) => `${i + 1}. ${d.title}${d.content ? `: ${d.content.substring(0, 100)}` : ''}\n`).join('')}\n` : ''}${relatedHighlights && relatedHighlights.length > 0 ? `KEY HIGHLIGHTS\n${relatedHighlights.map((h, i) => `${i + 1}. ${h.label || 'Highlight'}: ${h.content.substring(0, 150)}\n`).join('')}\n` : ''}${conversationContext ? `CONVERSATION CONTEXT\nFrom: ${conversationContext.title}\nKey Messages:\n${conversationContext.messages.slice(0, 5).map((m) => `- ${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'AI' : m.role}: ${m.content}\n`).join('')}\n` : ''}INTENT: Stress-test / Re-evaluate this decision

Please help me:
- Identify potential risks or blind spots given the project context
- Consider alternative approaches in light of related tasks and decisions
- Evaluate reversibility and impact on the project
- Suggest validation steps or experiments
- Identify any dependencies or blockers related to this decision

Structure your response as actionable items that can be converted into Tasks or Decisions.
```

### System Constraints Template

**File**: `lib/ai/stance.ts:15-22`

```
SYSTEM CONSTRAINTS:
- This context is provided to support deliberate thinking.
- Do not expand scope.
- Focus only on resolving the originating Task/Decision/Project intent.
- Avoid generating follow-on questions unless explicitly requested.
- Prefer a small set of concrete next actions or decision points.
```

---

## 4. DYNAMIC DATA INSERTION

### Project Continuity Packet Variables

| Variable | Source | Processing | Max Length/Count |
|----------|--------|------------|------------------|
| `intent` | User input (API request body) | Passed directly | N/A |
| `project.description` | `projects.description` | Truncated to 200 chars | 200 chars |
| `constraints[]` | `project.description` + top 3 decisions | Each decision truncated to 150 chars | 7 items max |
| `topTasks[]` | Scored and sorted tasks | Top 5 by score | 5 items |
| `topDecisions[]` | Scored and sorted decisions | Top 5 by score, content truncated to 150 chars | 5 items |
| `topHighlights[]` | Scored and sorted highlights (redacted filtered) | Top 5 by score | 5 items |
| `conversations[]` | Recent conversations in project | Top 5 by recency | 5 items |
| `tensions[]` | Tasks with `[blocker]` or `[open loop]` + open tasks | Top 5 blockers, then top 3 open | 7 items max |
| `continuationInstruction` | Mapped from `intent` via `getIntentInstruction()` | See Section 2, Step 7 | N/A |
| `project.name` | `projects.name` | Passed directly | N/A |
| `topTasks.length` | Count of top tasks | Calculated | N/A |
| `topDecisions.length` | Count of top decisions | Calculated | N/A |
| `topHighlights.length` | Count of top highlights | Calculated | N/A |
| `conversations.length` | Count of conversations | Calculated | N/A |

### Task Start Chat Packet Variables

| Variable | Source | Processing | Max Length/Count |
|----------|--------|------------|------------------|
| `task.title` | `tasks.title` | Passed directly | N/A |
| `task.description` | `tasks.description` | Passed directly (no truncation) | N/A |
| `projectName` | `projects.name` (if `task.project_id` exists) | Passed directly | N/A |
| `highlightContent` | `highlights.content` (if `task.source_highlight_id` exists) | Truncated to 300 chars | 300 chars |

### Decision Start Chat Packet Variables

| Variable | Source | Processing | Max Length/Count |
|----------|--------|------------|------------------|
| `decision.title` | `decisions.title` | Passed directly | N/A |
| `decision.content` | `decisions.content` | Passed directly (no truncation) | N/A |
| `projectName` | `projects.name` (resolved via project_id or conversation_id) | Passed directly | N/A |
| `projectDescription` | `projects.description` | Truncated to 200 chars | 200 chars |
| `relatedTasks[]` | Tasks in project (status: open/in_progress/priority) | Limit 5, description truncated to 100 chars | 5 items |
| `otherDecisions[]` | Other decisions in project | Limit 5, content truncated to 100 chars | 5 items |
| `relatedHighlights[]` | Highlights from project conversations | Limit 10, content truncated to 150 chars | 10 items |
| `conversationContext.messages[]` | Messages from decision's conversation | Limit 10, content truncated to 200 chars each | 10 items, 200 chars each |

### Scoring Variables (calculateImportanceScore)

| Variable | Source | Formula |
|----------|--------|---------|
| `recencyScore` | `item.created_at` vs `now` | `Math.max(0, 1 - daysSinceCreation / 30)` × 0.3 |
| `task.status === 'priority'` | `tasks.status` | +0.4 |
| `task.status === 'open' \|\| 'in_progress'` | `tasks.status` | +0.2 |
| `task.description.includes('[blocker]')` | `tasks.description` | +0.3 |
| `type === 'decision'` | Item type | +0.3 |
| `highlight.label` | `highlights.label` | +0.2 |

---

## 5. OUTPUT CONTRACT / RESPONSE INSTRUCTIONS

### Project Continuity Packet

**Location**: `lib/startChat/compiler.ts:308-322`

**Section 7: EXPLICIT CONTINUATION INSTRUCTION**
```
Provide structured output that can be harvested into Tasks, Decisions, or Highlights.
```

**Section 9: RETURN CONTRACT**
```
Structure your response as:
- Clear answer/recommendation
- Actionable next steps (as bullet points)
- Any decisions to make (as bullet points)
- Key insights to capture (as bullet points)
```

### Task Start Chat Packet

**Location**: `lib/startChat/compiler.ts:406`

```
Structure your response as actionable items that can be converted into Tasks or Decisions.
```

### Decision Start Chat Packet

**Location**: `lib/startChat/compiler.ts:646`

```
Structure your response as actionable items that can be converted into Tasks or Decisions.
```

**Additional guidance** (lines 640-645):
```
Please help me:
- Identify potential risks or blind spots given the project context
- Consider alternative approaches in light of related tasks and decisions
- Evaluate reversibility and impact on the project
- Suggest validation steps or experiments
- Identify any dependencies or blockers related to this decision
```

---

## 6. RELATED SAFETY OR CONSTRAINT LAYERS

### System Constraints (START_CHAT_CONSTRAINTS)

**File**: `lib/ai/stance.ts:15-22`  
**Applied to**: Task and Decision packets (not Project packets)

```
SYSTEM CONSTRAINTS:
- This context is provided to support deliberate thinking.
- Do not expand scope.
- Focus only on resolving the originating Task/Decision/Project intent.
- Avoid generating follow-on questions unless explicitly requested.
- Prefer a small set of concrete next actions or decision points.
```

**Usage**:
- Task packet: Line 384 (`lib/startChat/compiler.ts`)
- Decision packet: Line 571 (`lib/startChat/compiler.ts`)
- Project packet: **NOT used** (relies on section structure instead)

### Thinking Stance (THINKING_STANCE)

**File**: `lib/ai/stance.ts:7-13`  
**Applied to**: Not directly in continuity prompts (used in other LLM calls like digest, answer synthesis)

```
Favor clarity, containment, and forward motion.
Avoid recursive ideation or open-ended exploration.
Bias toward decisions, commitments, or concrete next actions.
If uncertainty exists, surface it explicitly rather than expanding scope.
Prefer reduction over expansion.
```

**Note**: This is NOT included in continuity prompts themselves, but represents the overall INDEX stance that influences prompt design.

### Prompt Budget Enforcement

**Location**: `lib/startChat/compiler.ts:41, 325-327, 408-410, 649-651`  
**Constant**: `PROMPT_BUDGET = 7000` characters

**Enforcement**:
- Applied to all three packet types
- If prompt exceeds budget: truncate to `PROMPT_BUDGET - 100` and append `'\n\n[Prompt truncated to budget]'`
- Applied after full assembly, before return

### Data Filtering Constraints

**Redaction Filtering**:
- **Location**: `lib/startChat/compiler.ts:183-192`
- **Action**: Excludes highlights from conversations that have been redacted
- **Query**: `redactions` table filtered by `project_id` and `user_id`

**Inactive Filtering**:
- **Applied to**: Tasks, decisions, conversations
- **Filter**: `is_inactive = false` in all queries
- **Purpose**: Exclude archived/deleted items

**Status Filtering (Tasks)**:
- **Location**: `lib/startChat/compiler.ts:123`
- **Filter**: `status IN ('open', 'in_progress', 'priority')`
- **Purpose**: Only include active tasks

**Conversation Filtering**:
- **Location**: `lib/startChat/compiler.ts:152`
- **Filter**: `is_inactive = false`
- **Purpose**: Exclude archived conversations

### Truncation Rules

| Field | Max Length | Location |
|-------|------------|----------|
| `project.description` (in constraints) | 200 chars | Line 226 |
| `decision.content` (in constraints) | 150 chars | Line 231 |
| `highlightContent` (task packet) | 300 chars | Line 397 |
| `projectDescription` (decision packet) | 200 chars | Line 586 |
| `task.description` (decision packet) | 100 chars | Line 597 |
| `decision.content` (decision packet) | 100 chars | Line 610 |
| `highlight.content` (decision packet) | 150 chars | Line 621 |
| `message.content` (decision packet) | 200 chars | Line 539 |
| Full prompt | 7000 chars | Line 41, 325 |

### Intent Validation

**Location**: `app/api/start-chat/generate/route.ts:49-54`

**Constraint**: For `originType === 'project'`, `intent` is required. Returns 400 error if missing.

**Allowed Origin Types**:
- `'project'` (requires intent)
- `'task'` (intent optional)
- `'decision'` (intent optional)

**Rejected Origin Types** (lines 42-46):
- `'highlight'` → Returns 400: "Start Chat is not available from Highlights or Conversations. Convert to a Task or Decision first."
- `'conversation'` → Same error as above

---

## Summary

The Continuity Prompt system has **three distinct compilation paths** (Project, Task, Decision) with different structures and data sources. All paths:

1. Fetch relevant data from Supabase
2. Score and filter thought objects
3. Assemble prompt string with hardcoded section headers
4. Enforce 7000-character budget
5. Return `{ promptText: string, contextRefs: ContextRef[] }`

The **Project packet** is the most comprehensive (9 sections), while **Task** and **Decision** packets are simpler and include `START_CHAT_CONSTRAINTS` at the top.

All prompts emphasize **structured, harvestable output** that can be converted back into Tasks, Decisions, or Highlights.
