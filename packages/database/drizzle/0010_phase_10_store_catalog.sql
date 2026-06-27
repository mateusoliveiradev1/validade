-- Phase 10 store catalog hardening.
-- T10-P2: store scopes become explicit infrastructure before a 23-store staging UAT.

CREATE TABLE IF NOT EXISTS stores (
  store_id text PRIMARY KEY,
  store_code text NOT NULL,
  store_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT stores_code_length_check CHECK (char_length(store_code) BETWEEN 1 AND 80),
  CONSTRAINT stores_name_length_check CHECK (char_length(store_name) BETWEEN 1 AND 240),
  CONSTRAINT stores_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS stores_code_uidx ON stores (store_code);
CREATE INDEX IF NOT EXISTS stores_status_name_idx ON stores (status, store_name);

WITH existing_store_scopes AS (
  SELECT store_id, store_name, created_at, updated_at FROM store_memberships
  UNION ALL
  SELECT store_id, store_name, created_at, created_at FROM auth_invites
  UNION ALL
  SELECT store_id, store_id, password_updated_at, password_updated_at FROM auth_credentials
  UNION ALL
  SELECT store_id, store_id, created_at, last_seen_at FROM auth_sessions
  UNION ALL
  SELECT store_id, store_id, created_at, coalesce(consumed_at, created_at) FROM auth_recovery_tokens
  UNION ALL
  SELECT store_id, store_id, received_at, received_at FROM privacy_requests
  UNION ALL
  SELECT store_id, store_id, occurred_at, occurred_at FROM membership_mutations
  UNION ALL
  SELECT store_id, store_id, created_at, updated_at FROM central_categories
  UNION ALL
  SELECT store_id, store_id, created_at, updated_at FROM central_products
  UNION ALL
  SELECT store_id, store_id, created_at, coalesce(reviewed_at, created_at)
    FROM central_product_drafts
  UNION ALL
  SELECT store_id, store_id, created_at, updated_at FROM central_lots
  UNION ALL
  SELECT store_id, store_id, created_at, created_at FROM central_observations
  UNION ALL
  SELECT store_id, store_id, created_at, updated_at FROM central_projected_tasks
  UNION ALL
  SELECT store_id, store_id, created_at, updated_at FROM central_sync_commands
  UNION ALL
  SELECT store_id, store_id, created_at, coalesce(resolved_at, created_at)
    FROM central_sync_conflicts
  UNION ALL
  SELECT store_id, store_id, updated_at, updated_at FROM central_device_snapshots
  UNION ALL
  SELECT store_id, store_id, upload_requested_at, coalesce(uploaded_at, upload_requested_at)
    FROM evidence_assets
  UNION ALL
  SELECT store_id, store_name, occurred_at, received_at FROM shift_closures
  UNION ALL
  SELECT store_id, store_id, acknowledged_at, received_at FROM shift_handoffs
),
normalized_store_scopes AS (
  SELECT
    store_id,
    upper(regexp_replace(store_id, '[^a-zA-Z0-9]+', '_', 'g')) AS store_code,
    max(nullif(store_name, '')) AS store_name,
    min(created_at) AS created_at,
    max(updated_at) AS updated_at
  FROM existing_store_scopes
  WHERE store_id IS NOT NULL AND length(trim(store_id)) > 0
  GROUP BY store_id
)
INSERT INTO stores (store_id, store_code, store_name, status, created_at, updated_at)
SELECT
  store_id,
  left(store_code, 80),
  left(coalesce(store_name, store_id), 240),
  'active',
  coalesce(created_at, now()),
  coalesce(updated_at, now())
FROM normalized_store_scopes
ON CONFLICT (store_id) DO UPDATE SET
  store_code = excluded.store_code,
  store_name = excluded.store_name,
  updated_at = greatest(stores.updated_at, excluded.updated_at);

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('store_memberships', 'store_memberships_store_fkey'),
      ('membership_mutations', 'membership_mutations_store_fkey'),
      ('auth_invites', 'auth_invites_store_fkey'),
      ('auth_credentials', 'auth_credentials_store_fkey'),
      ('auth_sessions', 'auth_sessions_store_fkey'),
      ('auth_recovery_tokens', 'auth_recovery_tokens_store_fkey'),
      ('privacy_requests', 'privacy_requests_store_fkey'),
      ('central_categories', 'central_categories_store_fkey'),
      ('central_products', 'central_products_store_fkey'),
      ('central_product_drafts', 'central_product_drafts_store_fkey'),
      ('central_lots', 'central_lots_store_fkey'),
      ('central_observations', 'central_observations_store_fkey'),
      ('central_projected_tasks', 'central_projected_tasks_store_fkey'),
      ('central_sync_commands', 'central_sync_commands_store_fkey'),
      ('central_sync_conflicts', 'central_sync_conflicts_store_fkey'),
      ('central_device_snapshots', 'central_device_snapshots_store_fkey'),
      ('evidence_assets', 'evidence_assets_store_fkey'),
      ('shift_closures', 'shift_closures_store_fkey'),
      ('shift_handoffs', 'shift_handoffs_store_fkey')
    ) AS constraints(table_name, constraint_name)
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (store_id) REFERENCES stores (store_id) ON UPDATE CASCADE ON DELETE RESTRICT',
        item.table_name,
        item.constraint_name
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END
$$;

COMMENT ON TABLE stores IS
  'Explicit store catalog for store-scoped staging/production operation; operational records keep store_id as their tenant boundary.';
