-- FinnOS players and high scores. Additive: the old Finnertyverse tables are left alone.
CREATE TABLE IF NOT EXISTS finnos_players (
  twitch_id    text PRIMARY KEY,
  login        text NOT NULL,
  display_name text NOT NULL,
  avatar       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One best score per player per game.
CREATE TABLE IF NOT EXISTS finnos_scores (
  game        text NOT NULL,
  twitch_id   text NOT NULL REFERENCES finnos_players (twitch_id) ON DELETE CASCADE,
  score       integer NOT NULL,
  plays       integer NOT NULL DEFAULT 1,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game, twitch_id)
);

CREATE INDEX IF NOT EXISTS finnos_scores_game_score ON finnos_scores (game, score DESC);
