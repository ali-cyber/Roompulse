CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE room_type AS ENUM ('NORMAL', 'READING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_category AS ENUM ('MUSIC', 'TEMP', 'READING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE music_value AS ENUM ('HIGHER', 'LOWER', 'MUTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE temp_value AS ENUM ('WARMER', 'COOLER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE reading_value AS ENUM ('QUIET', 'READ_OUT_LOUD_OK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_label TEXT,
  join_code TEXT NOT NULL UNIQUE,
  host_secret TEXT NOT NULL UNIQUE,
  room_type room_type NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_settings (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  music_level TEXT,
  temperature TEXT,
  reading_mode TEXT
);

CREATE TABLE IF NOT EXISTS room_state (
  room_id UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  category feedback_category NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_room_cat_time
  ON feedback_events(room_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_room_cat_client_time
  ON feedback_events(room_id, category, client_hash, created_at DESC);
