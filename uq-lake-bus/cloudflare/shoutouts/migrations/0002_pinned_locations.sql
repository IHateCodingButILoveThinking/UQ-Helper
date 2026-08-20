CREATE TABLE IF NOT EXISTS shout_locations (
  id TEXT PRIMARY KEY,
  latitude_e6 INTEGER NOT NULL CHECK (latitude_e6 BETWEEN -27800000 AND -27100000),
  longitude_e6 INTEGER NOT NULL CHECK (longitude_e6 BETWEEN 152700000 AND 153500000),
  label TEXT NOT NULL DEFAULT '' CHECK (length(label) <= 60),
  kind TEXT NOT NULL CHECK (kind IN ('preset', 'pin')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shout_locations_bounds
  ON shout_locations (latitude_e6, longitude_e6);

CREATE INDEX IF NOT EXISTS idx_messages_location_visible_time
  ON messages (place_id, expires_at, report_count, created_at DESC);

INSERT OR IGNORE INTO shout_locations
  (id, latitude_e6, longitude_e6, label, kind, created_at)
VALUES
  ('great-court', -27497100, 153013300, 'Great Court', 'preset', 0),
  ('central-library', -27496000, 153014500, 'Central Library', 'preset', 0),
  ('uq-lakes', -27497600, 153017700, 'UQ Lakes', 'preset', 0),
  ('student-union', -27497700, 153015200, 'Student Union', 'preset', 0),
  ('uq-centre', -27499000, 153014400, 'UQ Centre', 'preset', 0),
  ('hawken', -27499000, 153016300, 'Hawken Engineering', 'preset', 0),
  ('law', -27495100, 153013100, 'Forgan Smith / Law', 'preset', 0);
