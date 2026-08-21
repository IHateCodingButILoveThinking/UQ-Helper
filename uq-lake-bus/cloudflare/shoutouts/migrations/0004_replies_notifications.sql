ALTER TABLE messages ADD COLUMN parent_id TEXT REFERENCES messages(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN author_hash TEXT;
ALTER TABLE messages ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_messages_parent_time
  ON messages (parent_id, created_at ASC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_hash TEXT NOT NULL,
  actor_hash TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reply', 'reaction')),
  message_id TEXT NOT NULL,
  parent_message_id TEXT,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_time
  ON notifications (recipient_hash, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expiry
  ON notifications (expires_at);
