# Scripts

## cleanup-test-data.ts

Cleanup script to remove all test data before reimporting fresh conversations.

### Prerequisites

- Node.js with TypeScript support
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (required for admin operations)

### Usage

**Using npm script (recommended):**
```bash
npm run cleanup
```

**Or directly with tsx:**
```bash
npx tsx scripts/cleanup-test-data.ts
```

**With email specified:**
```bash
npm run cleanup -- --email=your@email.com
# or
npx tsx scripts/cleanup-test-data.ts --email=your@email.com
```

**Delete user account as well:**
```bash
npm run cleanup -- --email=your@email.com --delete-account
# or
npx tsx scripts/cleanup-test-data.ts --email=your@email.com --delete-account
```

### What it deletes

- All conversations and messages
- All message chunks and embeddings
- All projects and project links
- All highlights and highlight embeddings
- All tasks and decisions
- All tags and themes
- All weekly digests
- All imports and jobs
- All start chat runs
- Optionally: User account and profile (if `--delete-account` flag is used)

### Safety

- Requires explicit confirmation (type 'yes')
- Shows data counts before deletion
- Uses service role key (bypasses RLS) for cleanup
- Does NOT delete the user account by default (only data)

### Example Output

```
🧹 INDEX Test Data Cleanup Script

⚠️  WARNING: This will delete ALL your data!
   - All conversations, messages, projects
   - All highlights, tasks, decisions
   - All tags, themes, digests

Enter your email address: test@example.com

📧 Found user: test@example.com (abc123...)

⚠️  Are you SURE you want to delete all data for this user? (type 'yes' to confirm): yes

🧹 Starting cleanup for user: abc123...

📊 Current data counts:
   Conversations: 15
   Projects: 3
   Tasks: 8
   Decisions: 5
   Highlights: 12

🗑️  Deleting data...

   ✓ Deleted 45 chunk embeddings
   ✓ Deleted highlight embeddings
   ✓ Deleted message chunks
   ✓ Deleted messages
   ✓ Deleted theme and tag links
   ✓ Deleted project-conversation links
   ✓ Deleted branch highlights
   ✓ Deleted highlights
   ✓ Deleted conversations
   ✓ Deleted tasks
   ✓ Deleted decisions
   ✓ Deleted start chat runs
   ✓ Deleted themes
   ✓ Deleted tags
   ✓ Deleted projects
   ✓ Deleted weekly digests
   ✓ Deleted imports
   ✓ Deleted jobs

✅ Cleanup complete!
```
