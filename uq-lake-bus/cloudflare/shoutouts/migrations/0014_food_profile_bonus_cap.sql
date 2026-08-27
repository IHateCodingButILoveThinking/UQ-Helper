-- The expanded rank track reaches Level 99 at a little over 60,000 EXP.
-- Keep a bounded founder/staff override, but permit enough EXP to reach it.
CREATE TABLE food_profile_overrides_next (
  author_hash TEXT PRIMARY KEY,
  xp_bonus INTEGER NOT NULL DEFAULT 0 CHECK (xp_bonus >= 0 AND xp_bonus <= 100000),
  label TEXT NOT NULL DEFAULT 'Founder bonus',
  updated_at INTEGER NOT NULL
);

INSERT INTO food_profile_overrides_next (author_hash, xp_bonus, label, updated_at)
SELECT author_hash, xp_bonus, label, updated_at
FROM food_profile_overrides;

DROP TABLE food_profile_overrides;

ALTER TABLE food_profile_overrides_next RENAME TO food_profile_overrides;
