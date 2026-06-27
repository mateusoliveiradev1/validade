-- Phase 10 production hardening for staging-like operation.
-- T10-P0: durable login throttling, central relational integrity, and draft status alignment.

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  attempt_id text PRIMARY KEY,
  identifier_hash text NOT NULL,
  attempted_at timestamptz NOT NULL,
  CONSTRAINT auth_login_attempts_hash_length_check CHECK (char_length(identifier_hash) = 64)
);

CREATE INDEX IF NOT EXISTS auth_login_attempts_identifier_attempted_idx
  ON auth_login_attempts (identifier_hash, attempted_at DESC);
CREATE INDEX IF NOT EXISTS auth_login_attempts_attempted_idx
  ON auth_login_attempts (attempted_at);

ALTER TABLE central_product_drafts
  DROP CONSTRAINT IF EXISTS central_product_drafts_review_status_check;

ALTER TABLE central_product_drafts
  ADD CONSTRAINT central_product_drafts_review_status_check
  CHECK (review_status IN ('pending', 'pending_review', 'validated', 'rejected', 'discarded'));

DO $$
BEGIN
  ALTER TABLE central_products
    ADD CONSTRAINT central_products_store_product_uidx UNIQUE (store_id, central_product_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_lots
    ADD CONSTRAINT central_lots_store_lot_uidx UNIQUE (store_id, central_lot_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_sync_commands
    ADD CONSTRAINT central_sync_commands_store_command_uidx UNIQUE (store_id, command_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_product_drafts
    ADD CONSTRAINT central_product_drafts_product_fkey
    FOREIGN KEY (store_id, central_product_id)
    REFERENCES central_products (store_id, central_product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_lots
    ADD CONSTRAINT central_lots_product_fkey
    FOREIGN KEY (store_id, central_product_id)
    REFERENCES central_products (store_id, central_product_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_observations
    ADD CONSTRAINT central_observations_lot_fkey
    FOREIGN KEY (store_id, central_lot_id)
    REFERENCES central_lots (store_id, central_lot_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_projected_tasks
    ADD CONSTRAINT central_projected_tasks_lot_fkey
    FOREIGN KEY (store_id, central_lot_id)
    REFERENCES central_lots (store_id, central_lot_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE central_sync_conflicts
    ADD CONSTRAINT central_sync_conflicts_command_fkey
    FOREIGN KEY (store_id, command_id)
    REFERENCES central_sync_commands (store_id, command_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
