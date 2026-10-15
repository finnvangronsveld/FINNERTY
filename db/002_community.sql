-- FinnOS community: guestbook, lobby chat, achievements, announcements, weekly tournament, bans.
CREATE TABLE IF NOT EXISTS finnos_guestbook (
  id          bigserial PRIMARY KEY,
  twitch_id   text NOT NULL REFERENCES finnos_players (twitch_id) ON DELETE CASCADE,
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 280),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finnos_guestbook_recent ON finnos_guestbook (created_at DESC);

CREATE TABLE IF NOT EXISTS finnos_chat (
  id          bigserial PRIMARY KEY,
  twitch_id   text NOT NULL REFERENCES finnos_players (twitch_id) ON DELETE CASCADE,
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 300),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finnos_chat_recent ON finnos_chat (id DESC);

CREATE TABLE IF NOT EXISTS finnos_achievements (
  twitch_id   text NOT NULL REFERENCES finnos_players (twitch_id) ON DELETE CASCADE,
  code        text NOT NULL,
  earned_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (twitch_id, code)
);

CREATE TABLE IF NOT EXISTS finnos_announcements (
  id          bigserial PRIMARY KEY,
  message     text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 200),
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finnos_status (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Best score per player for the game of the week. week looks like 2026-W42.
CREATE TABLE IF NOT EXISTS finnos_weekly (
  week        text NOT NULL,
  game        text NOT NULL,
  twitch_id   text NOT NULL REFERENCES finnos_players (twitch_id) ON DELETE CASCADE,
  score       integer NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week, twitch_id)
);

CREATE TABLE IF NOT EXISTS finnos_bans (
  twitch_id   text PRIMARY KEY,
  login       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
