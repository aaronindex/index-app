INDEX — V1 Wireframe Blueprint

(Figma-ready text wireframes, layout notes, and component definitions)

🧩 0. GLOBAL DESIGN PRINCIPLES

Simple first. Powerful under the surface.

White space > UI noise.

Status pills everywhere.

Toolbelt = always available.

Import is a first-class action.

Every screen has a clear “center of gravity.”

Hierarchy = Projects → Chats → Branches → Highlights.

🏠 1. HOME
+------------------------------------------------------------+
|  INDEX  |  Projects  |  Toolbelt  |  Import                |
+------------------------------------------------------------+

──────────  PRIORITY  ──────────
[Card] Project: Index App (P)
[Card] Chat: "AI Positioning Work" (P)
[Card] Branch: "PBI Category Narrative" (P)

──────────  OPEN  ──────────
[List]
• Project: Lightning Society (O)
• Chat: "Garden Phase 0 Plan" (O)
• Branch: "Marketing Experiments" (O)

──────────  THIS WEEK  ──────────
[Digest Preview]
Highlights: 12
Signals: 3 new
Decisions: 1 made

──────────  IMPORT  ──────────
[Button] Import new chats

Notes

HOME shows only Priority + Open by default.

Everything else is intentionally buried to reduce cognitive load.

📁 2. PROJECTS LIST
+------------------------------------------------------------+
|  INDEX  |  Projects (Active)  |  Toolbelt  |  Import       |
+------------------------------------------------------------+

Projects
--------------------------------------------------------------
[Project Card]
Name: Index App
Status: Priority
Chats: 14   Branches: 6   Highlights: 42
Last Updated: 2 hours ago

[Project Card]
Name: Personal Growth
Status: Open
Chats: 5   Branches: 3   Highlights: 12

[Project Card]
Name: Family / Kids
Status: Dormant (dimmed)
Chats: 8   Branches: 1   Highlights: 7

📂 3. PROJECT VIEW
+------------------------------------------------------------+
| < Back | Project: Index App   [Status: Priority]           |
+------------------------------------------------------------+

Tabs:  Chats | Branches | Highlights | Decisions

──────────  CHATS TAB  ──────────
[Chat Row]
Title: Strategic Positioning
Status: Priority
Updated: Today
Branches: 3
Highlights: 14

[Chat Row]
Title: Engineering Pairing
Status: Open
Updated: Yesterday
Branches: 2
Highlights: 6

──────────  ADD CHAT  ──────────
[Button] Import Chats Into This Project

💬 4. CHAT VIEW

This is the core of INDEX.

+------------------------------------------------------------+
| < Back | Chat: Strategic Positioning      [Status: Open]   |
|        Summary | Decisions | Review | Digest | ...Tools    |
+------------------------------------------------------------+

Main Content Area
--------------------------------------------------------------
[Timestamp] [User] “Here’s how I'm thinking about the market…”
[Assistant] “Here are four arenas…”

[Highlight button appears on hover]
[Highlight applied = soft yellow underline]
[Sidebar updates]

[User] “Index should not compete with PKM tools.”
[Assistant] "It sits in the PBI space."

--------------------------------------------------------------

SIDEBAR: BRANCHES
--------------------------------------------------------------
Branches
- PBI Category Positioning (Priority)
- Target Personas
- Moat & Defensibility
- GTM Narrative

[Button] + Create Branch

Branch Creation Flow

User selects one or more highlights → clicks “Create Branch” → auto-suggested title → Branch is created but retains links back to source chat.

🌿 5. BRANCH VIEW
+------------------------------------------------------------+
| < Back | Branch: PBI Category Positioning (Priority)      |
+------------------------------------------------------------+

Highlights Included (4)
--------------------------------------------------------------
• “Index is the Personal BI layer…”
• “Not PKM, not chat…”
• “A new category: PBI…”
• “This is why Index is first-principles differentiated…”

Source Chat: Strategic Positioning
--------------------------------------------------------------
[Link back to original chat context]


Branches = curated meaning.

✨ 6. HIGHLIGHTS VIEW
+------------------------------------------------------------+
|  Highlights (All Projects)    Filter: [Status] [Project]   |
+------------------------------------------------------------+

[Highlight Card]
“Index is Business Intelligence for your mind.”
From: Strategic Positioning
Status: Priority
Linked Branches: PBI Positioning

[Highlight Card]
“Weekly digest should be narrative.”
From: Founder Ops Chat
Status: Open
Linked Branches: Weekly Rituals


Highlights = the atomic memory unit.

🧰 7. TOOLBELT (Global Modal)

When user clicks “Toolbelt”:

+------------------------------------------------------------+
|  TOOLBELT                                                  |
+------------------------------------------------------------+

[Tool] SUMMARY
- (context-aware: chat, branch, project)

[Tool] REVIEW
- Priority + Open across Index

[Tool] DECISIONS
- List of all decisions made
- Linked to source chats/branches

[Tool] WEEKLY DIGEST
- Generate → Preview → Save/Export


Future Tools:

Noise Collapse

Thread Explorer

Theme Builder

But not V1.

📥 8. IMPORT PANEL
+------------------------------------------------------------+
|  Import Conversations                                       |
+------------------------------------------------------------+

Step 1 — Choose Source
[OpenAI] [Claude] [Cursor] [Slack] [Upload JSON]

Step 2 — Preview
[List of chats detected]
✓ Strategic Positioning (14 messages)
✓ Build Architecture (22 messages)
⧠ Random fun chat (ignore)

Step 3 — Assign to Project
[Dropdown: Select Project or Create New]

[Button] Import Selected

🗺️ 9. SITEMAP (V1)
Home
└── Projects
    ├── Project
    │   ├── Chats
    │   │    └── Chat
    │   │        └── Branch
    │   ├── Branches
    │   ├── Highlights
    │   └── Decisions
    └── Highlights (global)
Toolbelt (global)
Import (global)

🎯 10. What This Achieves

Dead simple navigation

Zero clutter

High leverage from minimal UI

Clear hierarchy (Home → Project → Chat → Branch → Highlight)

Index feels like a calm, intelligent layer

Users never feel like they’re switching apps — Index is a lens, not a workspace