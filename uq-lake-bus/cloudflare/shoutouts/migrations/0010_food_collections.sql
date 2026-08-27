CREATE TABLE IF NOT EXISTS food_collections (
  id TEXT PRIMARY KEY,
  author_hash TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 48),
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_food_collections_author
  ON food_collections (author_hash, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS food_collection_items (
  collection_id TEXT NOT NULL REFERENCES food_collections(id) ON DELETE CASCADE,
  shout_id TEXT NOT NULL REFERENCES food_shouts(id) ON DELETE CASCADE,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (collection_id, shout_id)
);

CREATE INDEX IF NOT EXISTS idx_food_collection_items_shout
  ON food_collection_items (shout_id, added_at DESC);
