PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 160),
  emoji TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL,
  avatar_variant INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_place_time
  ON messages (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expiry
  ON messages (expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  client_hash TEXT PRIMARY KEY,
  last_post_at INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  daily_count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_last_post
  ON rate_limits (last_post_at);

CREATE TABLE IF NOT EXISTS reactions (
  message_id TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, client_hash),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  message_id TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (message_id, client_hash),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
