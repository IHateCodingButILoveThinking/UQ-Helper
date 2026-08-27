-- Small, explicit staff/founder bonuses. These never create fake posts or ratings.
CREATE TABLE IF NOT EXISTS food_profile_overrides (
  author_hash TEXT PRIMARY KEY,
  xp_bonus INTEGER NOT NULL DEFAULT 0 CHECK (xp_bonus >= 0 AND xp_bonus <= 50000),
  label TEXT NOT NULL DEFAULT 'Founder bonus',
  updated_at INTEGER NOT NULL
);

