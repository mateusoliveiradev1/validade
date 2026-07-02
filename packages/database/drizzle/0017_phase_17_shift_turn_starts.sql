CREATE TABLE IF NOT EXISTS shift_turn_starts (
  start_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  store_id text NOT NULL,
  started_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_turn_starts_idempotency_key_uidx
  ON shift_turn_starts (idempotency_key);

CREATE INDEX IF NOT EXISTS shift_turn_starts_store_started_idx
  ON shift_turn_starts (store_id, started_at DESC);

COMMENT ON TABLE shift_turn_starts IS
  'Store-scoped signal that a safe or unsafe shift closure is no longer the active turn state because the next turn was prepared.';
