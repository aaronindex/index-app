// scripts/backfill-message-roles.ts
// Backfill script to fix message roles from raw_payload or by re-parsing conversations
// Run with: npx tsx scripts/backfill-message-roles.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { parseChatGPTExport } from '../lib/parsers/chatgpt';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  index_in_conversation: number;
  source_message_id: string | null;
  raw_payload: any;
}

async function backfillMessageRoles() {
  console.log('Starting message role backfill...\n');

  // Strategy: Try to backfill from raw_payload first, then fall back to re-parsing if needed
  let updatedFromRaw = 0;
  let updatedFromReparse = 0;
  let skipped = 0;
  let errors = 0;

  // Get all messages with role='user' that might need fixing
  const { data: messages, error: fetchError } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, index_in_conversation, source_message_id, raw_payload')
    .eq('role', 'user')
    .order('conversation_id')
    .order('index_in_conversation');

  if (fetchError) {
    console.error('Error fetching messages:', fetchError);
    process.exit(1);
  }

  if (!messages || messages.length === 0) {
    console.log('No messages with role="user" found. Nothing to backfill.');
    return;
  }

  console.log(`Found ${messages.length} messages with role="user" to check.\n`);

  // Group by conversation for efficient processing
  const messagesByConversation = new Map<string, Message[]>();
  for (const msg of messages) {
    const convId = msg.conversation_id;
    if (!messagesByConversation.has(convId)) {
      messagesByConversation.set(convId, []);
    }
    messagesByConversation.get(convId)!.push(msg as Message);
  }

  console.log(`Processing ${messagesByConversation.size} conversations...\n`);

  for (const [conversationId, convMessages] of messagesByConversation.entries()) {
    try {
      // Try to backfill from raw_payload first
      let updatedInConv = 0;
      
      for (const msg of convMessages) {
        if (msg.raw_payload) {
          try {
            // Parse raw_payload if it's a string
            let rawPayload = msg.raw_payload;
            if (typeof rawPayload === 'string') {
              rawPayload = JSON.parse(rawPayload);
            }

            // Extract role from raw_payload
            let role: string = 'user';
            
            if (rawPayload.author?.role) {
              const authorRole = rawPayload.author.role.toLowerCase();
              if (['user', 'assistant', 'system', 'tool'].includes(authorRole)) {
                role = authorRole;
              }
            } else if (rawPayload.role) {
              const msgRole = rawPayload.role.toLowerCase();
              if (['user', 'assistant', 'system', 'tool'].includes(msgRole)) {
                role = msgRole;
              }
            }

            if (role !== msg.role) {
              const { error: updateError } = await supabase
                .from('messages')
                .update({ role })
                .eq('id', msg.id);

              if (updateError) {
                console.error(`Error updating message ${msg.id}:`, updateError);
                errors++;
              } else {
                updatedFromRaw++;
                updatedInConv++;
              }
            } else {
              skipped++;
            }
          } catch (parseError) {
            console.error(`Error parsing raw_payload for message ${msg.id}:`, parseError);
            errors++;
          }
        } else {
          skipped++;
        }
      }

      if (updatedInConv > 0) {
        console.log(`✓ Conversation ${conversationId}: Updated ${updatedInConv} messages from raw_payload`);
      }
    } catch (err) {
      console.error(`Error processing conversation ${conversationId}:`, err);
      errors++;
    }
  }

  console.log('\n--- Backfill Summary ---');
  console.log(`Updated from raw_payload: ${updatedFromRaw}`);
  console.log(`Updated from re-parse: ${updatedFromReparse}`);
  console.log(`Skipped (already correct): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${messages.length}`);
}

// Run the backfill
backfillMessageRoles()
  .then(() => {
    console.log('\nBackfill completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });

