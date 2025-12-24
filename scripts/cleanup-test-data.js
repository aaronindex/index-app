// scripts/cleanup-test-data.js
/**
 * Cleanup script to remove all test data before reimporting fresh conversations.
 * 
 * Usage:
 *   node scripts/cleanup-test-data.js [--email=your@email.com] [--delete-account]
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function cleanupUserData(userId, deleteAccount = false) {
  console.log(`\n🧹 Starting cleanup for user: ${userId}\n`);

  try {
    // Get user email for confirmation
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.error('❌ User not found');
      return;
    }

    // Get counts before deletion
    const [
      { count: conversationsCount = 0 } = {},
      { count: projectsCount = 0 } = {},
      { count: tasksCount = 0 } = {},
      { count: decisionsCount = 0 } = {},
      { count: highlightsCount = 0 } = {},
    ] = await Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('decisions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('highlights').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    console.log('📊 Current data counts:');
    console.log(`   Conversations: ${conversationsCount || 0}`);
    console.log(`   Projects: ${projectsCount || 0}`);
    console.log(`   Tasks: ${tasksCount || 0}`);
    console.log(`   Decisions: ${decisionsCount || 0}`);
    console.log(`   Highlights: ${highlightsCount || 0}\n`);

    // Delete in order (respecting foreign key constraints)
    console.log('🗑️  Deleting data...\n');

    // 1. Delete message_chunk_embeddings (via chunks)
    const { data: chunks } = await supabase
      .from('message_chunks')
      .select('id')
      .eq('user_id', userId);
    
    if (chunks && chunks.length > 0) {
      const chunkIds = chunks.map((c) => c.id);
      await supabase.from('message_chunk_embeddings').delete().in('chunk_id', chunkIds);
      console.log(`   ✓ Deleted ${chunkIds.length} chunk embeddings`);
    }

    // 2. Delete highlight_embeddings
    const { data: highlights } = await supabase
      .from('highlights')
      .select('id')
      .eq('user_id', userId);
    
    if (highlights && highlights.length > 0) {
      const highlightIds = highlights.map((h) => h.id);
      await supabase.from('highlight_embeddings').delete().in('highlight_id', highlightIds);
      console.log(`   ✓ Deleted highlight embeddings`);
    }

    // 3. Delete message_chunks
    await supabase.from('message_chunks').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted message chunks`);

    // 4. Delete messages
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId);
    
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);
      await supabase.from('messages').delete().in('conversation_id', conversationIds);
      console.log(`   ✓ Deleted messages`);
    }

    // 5. Delete theme_conversations and conversation_tags
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);
      await supabase.from('theme_conversations').delete().in('conversation_id', conversationIds);
      await supabase.from('conversation_tags').delete().in('conversation_id', conversationIds);
      console.log(`   ✓ Deleted theme and tag links`);
    }

    // 6. Delete project_conversations
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);
    
    if (userProjects && userProjects.length > 0) {
      const projectIds = userProjects.map((p) => p.id);
      await supabase.from('project_conversations').delete().in('project_id', projectIds);
    }
    
    // Also delete by conversation_id
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);
      await supabase.from('project_conversations').delete().in('conversation_id', conversationIds);
    }
    
    if ((userProjects && userProjects.length > 0) || (conversations && conversations.length > 0)) {
      console.log(`   ✓ Deleted project-conversation links`);
    }

    // 7. Delete branch_highlights (if any)
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);
      await supabase.from('branch_highlights').delete().in('branch_conversation_id', conversationIds);
      console.log(`   ✓ Deleted branch highlights`);
    }

    // 8. Delete highlights
    await supabase.from('highlights').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted highlights`);

    // 9. Delete conversations
    await supabase.from('conversations').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted conversations`);

    // 10. Delete tasks
    await supabase.from('tasks').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted tasks`);

    // 11. Delete decisions
    await supabase.from('decisions').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted decisions`);

    // 12. Delete start_chat_runs
    await supabase.from('start_chat_runs').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted start chat runs`);

    // 13. Delete themes
    await supabase.from('themes').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted themes`);

    // 14. Delete tags (and conversation_tags already deleted above)
    await supabase.from('tags').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted tags`);

    // 15. Delete projects
    await supabase.from('projects').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted projects`);

    // 16. Delete weekly_digests
    await supabase.from('weekly_digests').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted weekly digests`);

    // 17. Delete imports
    await supabase.from('imports').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted imports`);

    // 18. Delete jobs
    await supabase.from('jobs').delete().eq('user_id', userId);
    console.log(`   ✓ Deleted jobs`);

    // 19. Optionally delete the user account
    if (deleteAccount) {
      // Get auth user ID
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (authUser && authUser.user) {
        await supabase.auth.admin.deleteUser(userId);
        console.log(`   ✓ Deleted auth user account`);
      }
      
      // Delete profile
      await supabase.from('profiles').delete().eq('id', userId);
      console.log(`   ✓ Deleted profile`);
    }

    console.log('\n✅ Cleanup complete!\n');
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const deleteAccount = args.includes('--delete-account');
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const email = emailArg ? emailArg.split('=')[1] : null;

  console.log('🧹 INDEX Test Data Cleanup Script\n');
  console.log('⚠️  WARNING: This will delete ALL your data!');
  console.log('   - All conversations, messages, projects');
  console.log('   - All highlights, tasks, decisions');
  console.log('   - All tags, themes, digests');
  if (deleteAccount) {
    console.log('   - Your user account will also be deleted');
  }
  console.log('');

  let userId;

  if (email) {
    // Find user by email
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser && authUser.users ? authUser.users.find((u) => u.email === email) : null;
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    userId = user.id;
    console.log(`📧 Found user: ${email} (${userId})\n`);
  } else {
    // Interactive mode: ask for email
    const inputEmail = await question('Enter your email address: ');
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const user = authUser && authUser.users ? authUser.users.find((u) => u.email === inputEmail) : null;
    
    if (!user) {
      console.error(`❌ User with email ${inputEmail} not found`);
      process.exit(1);
    }

    userId = user.id;
    console.log(`\n📧 Found user: ${inputEmail} (${userId})\n`);
  }

  // Final confirmation
  const confirm = await question(
    `⚠️  Are you SURE you want to delete all data for this user? (type 'yes' to confirm): `
  );

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Cleanup cancelled');
    rl.close();
    process.exit(0);
  }

  await cleanupUserData(userId, deleteAccount);
  rl.close();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

