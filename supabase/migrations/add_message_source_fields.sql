-- Add source_message_id and raw_payload columns to messages table
-- These fields enable backfilling roles and prevent duplicates

-- Add source_message_id (nullable for existing messages, required going forward)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS source_message_id TEXT;

-- Add raw_payload to store original message data for backfill
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_source_message_id ON messages(conversation_id, source_message_id) WHERE source_message_id IS NOT NULL;

-- Add unique constraint to prevent duplicates per conversation
-- Note: This will fail if there are existing duplicates, so we use a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_source 
ON messages(conversation_id, source_message_id) 
WHERE source_message_id IS NOT NULL;

