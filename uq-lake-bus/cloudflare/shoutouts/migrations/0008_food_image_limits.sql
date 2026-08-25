CREATE TABLE IF NOT EXISTS food_shout_images (
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 2),
  mime_type TEXT NOT NULL,
  width INTEGER CHECK (width IS NULL OR width BETWEEN 1 AND 4096),
  height INTEGER CHECK (height IS NULL OR height BETWEEN 1 AND 4096),
  PRIMARY KEY (shout_id, sort_order)
);

INSERT OR IGNORE INTO food_shout_images
  (shout_id, object_key, sort_order, mime_type, width, height)
SELECT id, image_key, 0, image_mime, image_width, image_height
  FROM food_shouts;

CREATE INDEX IF NOT EXISTS idx_food_shout_images_key
  ON food_shout_images (object_key);

CREATE TABLE IF NOT EXISTS food_storage_usage (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  used_bytes INTEGER NOT NULL DEFAULT 0 CHECK (used_bytes >= 0),
  max_bytes INTEGER NOT NULL CHECK (max_bytes BETWEEN 1048576 AND 10737418240),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO food_storage_usage (id, used_bytes, max_bytes, updated_at)
SELECT 1, COALESCE(SUM(byte_size), 0), 8589934592, unixepoch()
  FROM food_uploads;

CREATE TABLE IF NOT EXISTS food_upload_limits (
  client_hash TEXT PRIMARY KEY,
  last_upload_at INTEGER NOT NULL,
  day_key TEXT NOT NULL,
  daily_count INTEGER NOT NULL DEFAULT 0 CHECK (daily_count >= 0),
  daily_bytes INTEGER NOT NULL DEFAULT 0 CHECK (daily_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_food_upload_limits_last_upload
  ON food_upload_limits (last_upload_at);

CREATE TABLE IF NOT EXISTS food_network_limits (
  network_hash TEXT PRIMARY KEY,
  day_key TEXT NOT NULL,
  upload_count INTEGER NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  upload_bytes INTEGER NOT NULL DEFAULT 0 CHECK (upload_bytes >= 0),
  write_count INTEGER NOT NULL DEFAULT 0 CHECK (write_count >= 0),
  last_write_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS food_abuse_events (
  id TEXT PRIMARY KEY,
  actor_hash TEXT,
  network_hash TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('duplicate_post', 'client_upload_limit', 'network_upload_limit', 'network_write_limit', 'automated_frequency')
  ),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_abuse_events_time
  ON food_abuse_events (created_at DESC);

CREATE TABLE IF NOT EXISTS food_abuse_state (
  subject_type TEXT NOT NULL CHECK (subject_type IN ('client', 'network')),
  subject_hash TEXT NOT NULL,
  window_started_at INTEGER NOT NULL,
  window_count INTEGER NOT NULL DEFAULT 0 CHECK (window_count >= 0),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0),
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (subject_type, subject_hash)
);

CREATE TABLE IF NOT EXISTS food_block_list (
  subject_type TEXT NOT NULL CHECK (subject_type IN ('client', 'network')),
  subject_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_until INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (subject_type, subject_hash)
);

CREATE INDEX IF NOT EXISTS idx_food_block_list_expiry
  ON food_block_list (blocked_until);
