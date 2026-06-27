-- Phase 10 central capture truth for the real pilot flow.
-- T10-01/T10-03: products, lots, tasks, conflicts, and device snapshots are store scoped.
-- T10-04/T10-05: central sync state separates acknowledgement, conflict, discard, and resolution.
-- T10-06: prepare-turn reads fail closed when central facts are missing or stale.

DO $$
BEGIN
  CREATE TYPE central_package_source AS ENUM ('central', 'local_cache', 'pending_central');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE central_sync_state AS ENUM (
    'local',
    'pending_central',
    'synchronized',
    'conflict',
    'discarded',
    'resolved'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE central_product_status AS ENUM ('validated', 'draft', 'rejected', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE central_task_status AS ENUM ('active', 'resolved', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS central_products (
  central_product_id text PRIMARY KEY,
  store_id text NOT NULL,
  display_name text NOT NULL,
  category_id text NOT NULL,
  category_name text NOT NULL,
  status central_product_status NOT NULL DEFAULT 'validated',
  state central_sync_state NOT NULL DEFAULT 'synchronized',
  gtin text,
  category_rule_profile jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_products_display_name_length_check CHECK (char_length(display_name) BETWEEN 1 AND 160),
  CONSTRAINT central_products_category_name_length_check CHECK (char_length(category_name) BETWEEN 1 AND 160)
);

CREATE INDEX IF NOT EXISTS central_products_store_name_idx
  ON central_products (store_id, display_name);
CREATE INDEX IF NOT EXISTS central_products_store_category_idx
  ON central_products (store_id, category_id);
CREATE INDEX IF NOT EXISTS central_products_store_status_idx
  ON central_products (store_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS central_products_store_gtin_uidx
  ON central_products (store_id, gtin)
  WHERE gtin IS NOT NULL;

CREATE TABLE IF NOT EXISTS central_product_drafts (
  draft_id text PRIMARY KEY,
  store_id text NOT NULL,
  central_product_id text NOT NULL,
  requested_by text NOT NULL,
  requested_by_label text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'merged')),
  similar_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  created_at timestamptz NOT NULL,
  reviewed_at timestamptz,
  CONSTRAINT central_product_drafts_similar_ids_check CHECK (jsonb_typeof(similar_product_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS central_product_drafts_store_status_idx
  ON central_product_drafts (store_id, review_status);
CREATE INDEX IF NOT EXISTS central_product_drafts_store_created_idx
  ON central_product_drafts (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS central_product_drafts_product_idx
  ON central_product_drafts (central_product_id);

CREATE TABLE IF NOT EXISTS central_lots (
  central_lot_id text PRIMARY KEY,
  store_id text NOT NULL,
  central_product_id text NOT NULL,
  product_display_name text NOT NULL,
  lot_identity jsonb NOT NULL,
  lot_identity_key text NOT NULL,
  mode text NOT NULL,
  current_location jsonb NOT NULL,
  state central_sync_state NOT NULL DEFAULT 'synchronized',
  source central_package_source NOT NULL DEFAULT 'central',
  risk_state text,
  expires_at text,
  received_at text,
  quality_inspection_due_at text,
  approximate_quantity integer CHECK (approximate_quantity IS NULL OR approximate_quantity >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_lots_identity_check CHECK (jsonb_typeof(lot_identity) = 'object'),
  CONSTRAINT central_lots_location_check CHECK (jsonb_typeof(current_location) = 'object')
);

CREATE INDEX IF NOT EXISTS central_lots_store_product_idx
  ON central_lots (store_id, central_product_id);
CREATE INDEX IF NOT EXISTS central_lots_store_identity_idx
  ON central_lots (store_id, lot_identity_key);
CREATE INDEX IF NOT EXISTS central_lots_store_risk_idx
  ON central_lots (store_id, risk_state);
CREATE INDEX IF NOT EXISTS central_lots_store_state_idx
  ON central_lots (store_id, state);

CREATE TABLE IF NOT EXISTS central_observations (
  observation_id text PRIMARY KEY,
  store_id text NOT NULL,
  central_lot_id text NOT NULL,
  actor_id text NOT NULL,
  actor_display_name text NOT NULL,
  status text NOT NULL,
  location jsonb NOT NULL,
  quantity jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT central_observations_location_check CHECK (jsonb_typeof(location) = 'object'),
  CONSTRAINT central_observations_quantity_check CHECK (jsonb_typeof(quantity) = 'object')
);

CREATE INDEX IF NOT EXISTS central_observations_store_lot_idx
  ON central_observations (store_id, central_lot_id);
CREATE INDEX IF NOT EXISTS central_observations_store_occurred_idx
  ON central_observations (store_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS central_projected_tasks (
  central_task_id text PRIMARY KEY,
  active_key text NOT NULL,
  store_id text NOT NULL,
  central_lot_id text NOT NULL,
  product_display_name text NOT NULL,
  current_location jsonb NOT NULL,
  risk_state text NOT NULL,
  severity text NOT NULL,
  required_resolution text NOT NULL,
  status central_task_status NOT NULL DEFAULT 'active',
  state central_sync_state NOT NULL DEFAULT 'synchronized',
  owner_label text NOT NULL,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_action text,
  resolution_reason text,
  actor_label text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_projected_tasks_location_check CHECK (jsonb_typeof(current_location) = 'object'),
  CONSTRAINT central_projected_tasks_resolved_check CHECK (
    status <> 'resolved' OR (
      resolved_at IS NOT NULL AND resolution_action IS NOT NULL AND actor_label IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS central_projected_tasks_store_active_key_uidx
  ON central_projected_tasks (store_id, active_key);
CREATE INDEX IF NOT EXISTS central_projected_tasks_store_status_idx
  ON central_projected_tasks (store_id, status);
CREATE INDEX IF NOT EXISTS central_projected_tasks_store_lot_idx
  ON central_projected_tasks (store_id, central_lot_id);
CREATE INDEX IF NOT EXISTS central_projected_tasks_store_resolved_idx
  ON central_projected_tasks (store_id, resolved_at DESC);

CREATE TABLE IF NOT EXISTS central_sync_commands (
  command_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  store_id text NOT NULL,
  device_id text NOT NULL,
  kind text NOT NULL,
  state central_sync_state NOT NULL DEFAULT 'pending_central',
  payload jsonb NOT NULL,
  central_version integer NOT NULL DEFAULT 1 CHECK (central_version > 0),
  accepted_at timestamptz,
  discarded_at timestamptz,
  discard_reason text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_sync_commands_payload_check CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT central_sync_commands_discard_reason_check CHECK (
    state <> 'discarded' OR (discarded_at IS NOT NULL AND discard_reason IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS central_sync_commands_idempotency_key_uidx
  ON central_sync_commands (idempotency_key);
CREATE INDEX IF NOT EXISTS central_sync_commands_store_state_idx
  ON central_sync_commands (store_id, state);
CREATE INDEX IF NOT EXISTS central_sync_commands_store_device_idx
  ON central_sync_commands (store_id, device_id);

CREATE TABLE IF NOT EXISTS central_sync_conflicts (
  conflict_id text PRIMARY KEY,
  command_id text NOT NULL,
  store_id text NOT NULL,
  product_display_name text NOT NULL,
  lot_identity jsonb NOT NULL,
  current_location jsonb NOT NULL,
  reason text NOT NULL,
  state central_sync_state NOT NULL DEFAULT 'conflict',
  created_at timestamptz NOT NULL,
  resolved_at timestamptz,
  resolution_reason text,
  CONSTRAINT central_sync_conflicts_state_check CHECK (state IN ('conflict', 'discarded', 'resolved')),
  CONSTRAINT central_sync_conflicts_lot_identity_check CHECK (jsonb_typeof(lot_identity) = 'object'),
  CONSTRAINT central_sync_conflicts_location_check CHECK (jsonb_typeof(current_location) = 'object')
);

CREATE INDEX IF NOT EXISTS central_sync_conflicts_store_state_idx
  ON central_sync_conflicts (store_id, state);
CREATE INDEX IF NOT EXISTS central_sync_conflicts_command_idx
  ON central_sync_conflicts (command_id);

CREATE TABLE IF NOT EXISTS central_device_snapshots (
  device_id text NOT NULL,
  store_id text NOT NULL,
  prepared_at timestamptz,
  last_central_read_at timestamptz,
  last_hydrated_at timestamptz,
  pending_command_count integer NOT NULL DEFAULT 0 CHECK (pending_command_count >= 0),
  conflict_count integer NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  source central_package_source NOT NULL DEFAULT 'central',
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (device_id, store_id)
);

CREATE INDEX IF NOT EXISTS central_device_snapshots_store_updated_idx
  ON central_device_snapshots (store_id, updated_at DESC);

COMMENT ON TABLE central_products IS
  'Store-scoped central product catalog for prepare-turn and duplicate prevention. Fictional/test data only in repository fixtures.';
COMMENT ON TABLE central_lots IS
  'Store-scoped central lot snapshots used to hydrate mobile caches and web projections.';
COMMENT ON TABLE central_projected_tasks IS
  'Central active/resolved task projection. Empty result is not a safe-area claim.';
COMMENT ON TABLE central_sync_commands IS
  'Idempotent central sync command receipts without raw evidence binaries, device URIs, or signed URLs.';
COMMENT ON TABLE central_device_snapshots IS
  'Per-device prepare-turn freshness metadata. Raw session tokens are intentionally absent.';
