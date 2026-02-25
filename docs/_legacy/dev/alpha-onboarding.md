# Alpha Onboarding Guide

**For: INDEX Alpha Users**  
**Version: 1.0**  
**Last Updated: January 2025**

---

## Welcome to INDEX Alpha

Thank you for being an early adopter of INDEX! This guide will help you get started and make the most of your alpha experience.

## What is INDEX?

INDEX is your Personal Business Intelligence layer for AI conversations. It turns your ChatGPT, Claude, and other AI chats into a searchable, organized memory system.

**Core Philosophy:**
- Your data belongs to you
- We never train AI models on your conversations
- INDEX is the sensemaking layer, not a chat UI

---

## Getting Started

### 1. Sign Up / Sign In

1. Go to [indexapp.co](https://indexapp.co) (or your alpha URL)
2. Click "Sign up" to create an account
3. Verify your email address
4. You're in!

### 2. Import Your First Conversations

**Step 1: Export from ChatGPT**
1. Go to ChatGPT → Settings → Data Controls → Export Data
2. Request your data export (JSON format)
3. Download the `conversations.json` file when ready

**Step 2: Import to INDEX**
1. Click "Import" in the top navigation
2. Select your `conversations.json` file
3. Review detected conversations
4. Choose a project (or create new, or leave unassigned)
5. Click "Import Selected"

**What happens:**
- Conversations are imported with all messages
- Messages are chunked and embedded for search
- You can immediately search across all your conversations

### 3. Organize with Projects

**Create a Project:**
1. Go to "Projects" in navigation
2. Click "Create Project"
3. Name it (e.g., "Work", "Personal Growth", "Side Projects")
4. Add a description (optional)

**Assign Conversations:**
- During import: Select a project in the import flow
- After import: Go to "Unassigned" → Select conversations → "Assign to Project"

### 4. Search Your Conversations

**Ask Index:**
1. Click "Ask" in navigation
2. Type a question (e.g., "What did I discuss about pricing?")
3. View results with similarity scores
4. Click any result to view the full conversation

**Start Chat from Results:**
- Click "Start Chat →" on any search result
- Context is copied to clipboard
- Open ChatGPT/Claude/Cursor and paste to continue the conversation

### 5. Highlight & Branch

**Create Highlights:**
1. Open any conversation
2. Select text in a message
3. Click "Highlight" button
4. Add a label (optional)

**Create Branches:**
1. In a conversation, select highlights
2. Click "Create Branch" in sidebar
3. Give it a title
4. The branch becomes a new conversation linked to the original

**Start Chat from Highlights/Branches:**
- Click "Start Chat →" on any highlight or branch
- Get AI-ready context to continue exploring

### 6. Weekly Digests

**Generate a Digest:**
1. Go to "Toolbelt" in navigation
2. Click "Generate Weekly Digest"
3. Select week start and end dates
4. Click "Generate Digest"

**What you get:**
- AI-generated narrative summary
- Top themes with weights
- Open loops (unresolved questions/follow-ups)

**Send via Email:**
- View any digest
- Click "Send Email" to receive it in your inbox

---

## Key Features

### 🔍 Semantic Search
Search across all conversations using natural language. INDEX understands meaning, not just keywords.

### 📁 Project Organization
Group related conversations into projects. Keep work, personal, and side projects separate.

### ✨ Highlights
Save important snippets from conversations. Create atomic units of meaning.

### 🌿 Branching
Create focused sub-conversations from highlights. Explore ideas without losing context.

### 📧 Weekly Digests
Get AI-powered summaries of your weekly thinking. Identify patterns and open loops.

### 🔄 Round-Trip Chat
Start new AI conversations from any highlight, branch, or search result. INDEX generates context, you continue in ChatGPT/Claude.

---

## Best Practices

### Organizing Your Data

1. **Start with Projects**
   - Create 3-5 projects for major areas of your life/work
   - Don't over-organize—you can always reorganize later

2. **Use Highlights Strategically**
   - Highlight key insights, decisions, and open questions
   - Add labels to make highlights searchable

3. **Create Branches for Deep Dives**
   - When a conversation goes in multiple directions, branch it
   - Keep the original conversation intact

### Getting Value from Digests

1. **Generate Weekly**
   - Set a reminder to generate digests every Monday
   - Review themes and open loops

2. **Act on Open Loops**
   - Use "Start Chat" to follow up on unresolved questions
   - Close loops by creating new conversations

### Search Tips

1. **Ask Natural Questions**
   - "What did I decide about pricing?"
   - "Show me conversations about project architecture"
   - "What themes emerged last month?"

2. **Use Project Scoping**
   - Search within specific projects for focused results
   - Use global search to find connections across projects

---

## Your Data & Privacy

### Data Ownership
- **You own all your data**
- Export everything as JSON from Settings → Export All Data
- Delete your account anytime from Settings

### Privacy Commitment
- **We do not train AI models on your data**
- Your conversations are private
- We use your data only to provide INDEX service

### Data Storage
- Stored securely in Supabase (PostgreSQL)
- Encrypted connections (HTTPS)
- Row-level security ensures only you can access your data

---

## Feedback & Support

### How to Give Feedback

**In-App Feedback:**
1. Click "Feedback" in navigation (or Settings)
2. Fill out the feedback form
3. Submit—we read every piece of feedback!

**Email:**
- Direct email: aaron@indexapp.co
- Subject: "Alpha Feedback: [Topic]"

**What We Want to Know:**
- What's working well?
- What's confusing or broken?
- What features are you missing?
- How are you using INDEX?
- What would make INDEX more valuable?

### Known Limitations (Alpha)

- **Import Sources:** Currently supports ChatGPT exports only (Claude, Cursor coming soon)
- **Search:** Works best with 10+ conversations (more data = better results)
- **Digests:** Requires conversations from the selected week
- **Email:** Requires Resend API key configuration (we'll handle this)

### Bug Reports

If you encounter bugs:
1. Note what you were doing
2. What you expected to happen
3. What actually happened
4. Screenshots if helpful
5. Send to aaron@indexapp.co with subject "Alpha Bug: [Brief Description]"

---

## What's Next?

### Coming Soon (Post-Alpha)
- Claude and Cursor import support
- Browser extension for auto-capture
- Enhanced digest features
- Project-level summaries
- Team/shared workspaces

### Your Role as Alpha User

You're helping shape INDEX. Your feedback directly influences:
- Feature priorities
- UX improvements
- Product direction

**Thank you for being part of INDEX's journey!**

---

## Quick Reference

**Navigation:**
- **Projects** - View and organize conversations
- **Unassigned** - Conversations not in any project
- **Ask** - Semantic search across all conversations
- **Import** - Add new conversations
- **Toolbelt** - Generate digests and system tools
- **Settings** - Export data, delete account, privacy

**Keyboard Shortcuts:**
- Coming soon!

**Tips:**
- Start with importing 5-10 conversations to get a feel
- Create 2-3 projects to organize your thinking
- Generate a digest after your first week
- Use "Start Chat" to continue exploring ideas

---

## Questions?

Email: aaron@indexapp.co  
Subject: "Alpha Question: [Your Question]"

We're here to help you get the most out of INDEX!

