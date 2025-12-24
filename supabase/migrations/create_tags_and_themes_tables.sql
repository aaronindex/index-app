-- Create tags table for semantic tags extracted from conversations
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('entity', 'topic', 'person', 'project', 'technology', 'concept')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, category)
);

-- Create conversation_tags junction table
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  confidence DECIMAL(3, 2) DEFAULT 0.5, -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, tag_id)
);

-- Create themes table for auto-generated theme clusters
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight DECIMAL(3, 2) DEFAULT 0.5, -- Importance/activity level
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create theme_conversations junction table
CREATE TABLE IF NOT EXISTS theme_conversations (
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  relevance_score DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (theme_id, conversation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON themes(user_id);
CREATE INDEX IF NOT EXISTS idx_theme_conversations_theme_id ON theme_conversations(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_conversations_conversation_id ON theme_conversations(conversation_id);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_conversations ENABLE ROW LEVEL SECURITY;

-- Tags policies
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- Conversation tags policies
CREATE POLICY "Users can view their own conversation_tags"
  ON conversation_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own conversation_tags"
  ON conversation_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own conversation_tags"
  ON conversation_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_tags.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Themes policies
CREATE POLICY "Users can view their own themes"
  ON themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON themes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON themes FOR DELETE
  USING (auth.uid() = user_id);

-- Theme conversations policies
CREATE POLICY "Users can view their own theme_conversations"
  ON theme_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_conversations.theme_id
      AND themes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own theme_conversations"
  ON theme_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_conversations.theme_id
      AND themes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own theme_conversations"
  ON theme_conversations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM themes
      WHERE themes.id = theme_conversations.theme_id
      AND themes.user_id = auth.uid()
    )
  );

