CREATE TABLE IF NOT EXISTS food_uploads (
  object_key TEXT PRIMARY KEY,
  author_hash TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 2500000),
  width INTEGER CHECK (width IS NULL OR width BETWEEN 1 AND 4096),
  height INTEGER CHECK (height IS NULL OR height BETWEEN 1 AND 4096),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_food_uploads_expiry
  ON food_uploads (expires_at, claimed_at);

CREATE TABLE IF NOT EXISTS venue_anchors (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  normalized_name TEXT NOT NULL,
  latitude_e6 INTEGER NOT NULL CHECK (latitude_e6 BETWEEN -45000000 AND 82000000),
  longitude_e6 INTEGER NOT NULL CHECK (longitude_e6 BETWEEN 25000000 AND 180000000),
  provider TEXT,
  provider_place_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_provider_place
  ON venue_anchors (provider, provider_place_id)
  WHERE provider IS NOT NULL AND provider_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venue_bounds_name
  ON venue_anchors (latitude_e6, longitude_e6, normalized_name);

CREATE TABLE IF NOT EXISTS food_shouts (
  id TEXT PRIMARY KEY,
  author_hash TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  caption TEXT NOT NULL DEFAULT '' CHECK (length(caption) <= 280),
  latitude_e6 INTEGER NOT NULL CHECK (latitude_e6 BETWEEN -45000000 AND 82000000),
  longitude_e6 INTEGER NOT NULL CHECK (longitude_e6 BETWEEN 25000000 AND 180000000),
  location_label TEXT NOT NULL CHECK (length(location_label) BETWEEN 1 AND 120),
  place_name TEXT CHECK (place_name IS NULL OR length(place_name) <= 100),
  provider TEXT,
  provider_place_id TEXT,
  cuisine TEXT NOT NULL DEFAULT 'Other' CHECK (length(cuisine) BETWEEN 1 AND 40),
  shout_type TEXT NOT NULL CHECK (
    shout_type IN ('dish', 'drink', 'restaurant_find', 'market', 'cafe', 'dessert', 'deal', 'other')
  ),
  price_text TEXT CHECK (price_text IS NULL OR length(price_text) <= 40),
  price_numeric REAL CHECK (price_numeric IS NULL OR price_numeric BETWEEN 0 AND 1000000),
  vibe_tags_json TEXT CHECK (vibe_tags_json IS NULL OR length(vibe_tags_json) <= 300),
  geohash TEXT CHECK (geohash IS NULL OR length(geohash) BETWEEN 4 AND 12),
  image_key TEXT NOT NULL UNIQUE,
  image_mime TEXT NOT NULL,
  image_width INTEGER CHECK (image_width IS NULL OR image_width BETWEEN 1 AND 4096),
  image_height INTEGER CHECK (image_height IS NULL OR image_height BETWEEN 1 AND 4096),
  venue_anchor_id TEXT REFERENCES venue_anchors(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  like_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  confirmed_count INTEGER NOT NULL DEFAULT 0,
  unsure_count INTEGER NOT NULL DEFAULT 0,
  gone_count INTEGER NOT NULL DEFAULT 0,
  tried_count INTEGER NOT NULL DEFAULT 0,
  would_get_again_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_food_shouts_bounds_active
  ON food_shouts (status, latitude_e6, longitude_e6, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_shouts_author_time
  ON food_shouts (author_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_shouts_cuisine_type
  ON food_shouts (cuisine, shout_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_shouts_price
  ON food_shouts (price_numeric, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_shouts_geohash
  ON food_shouts (geohash);
CREATE INDEX IF NOT EXISTS idx_food_shouts_venue
  ON food_shouts (venue_anchor_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS food_comments (
  id TEXT PRIMARY KEY,
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  author_hash TEXT NOT NULL,
  parent_comment_id TEXT REFERENCES food_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 160),
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'deleted')),
  report_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_food_comments_shout_time
  ON food_comments (shout_id, parent_comment_id, status, created_at ASC);

CREATE TABLE IF NOT EXISTS food_reactions (
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  client_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('like', 'save')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (shout_id, client_hash, kind)
);

CREATE INDEX IF NOT EXISTS idx_food_reactions_client
  ON food_reactions (client_hash, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS food_reports (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('shout', 'comment')),
  entity_id TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (
    reason IN ('spam', 'wrong_location', 'not_food', 'inappropriate', 'duplicate', 'other')
  ),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (entity_type, entity_id, client_hash)
);

CREATE TABLE IF NOT EXISTS food_verifications (
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  client_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'unsure', 'gone')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (shout_id, client_hash)
);

CREATE INDEX IF NOT EXISTS idx_food_verifications_shout_time
  ON food_verifications (shout_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS food_tries (
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  client_hash TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('would_get_again', 'good', 'okay')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (shout_id, client_hash)
);

CREATE TABLE IF NOT EXISTS venue_summaries (
  venue_anchor_id TEXT PRIMARY KEY REFERENCES venue_anchors(id) ON DELETE CASCADE,
  total_shouts INTEGER NOT NULL DEFAULT 0,
  avg_dish_price REAL,
  positive_try_ratio REAL,
  adjusted_score REAL,
  total_tries INTEGER NOT NULL DEFAULT 0,
  primary_cuisine TEXT,
  latest_activity_at INTEGER,
  latest_verified_at INTEGER,
  glow_tier INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS food_place_cache (
  cache_key TEXT PRIMARY KEY,
  response_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_place_cache_expiry
  ON food_place_cache (expires_at);

CREATE TABLE IF NOT EXISTS food_provider_limits (
  provider TEXT PRIMARY KEY,
  last_request_at_ms INTEGER NOT NULL
);
