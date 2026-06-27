-- Phase 10 production-ops hardening.
-- T10-P1: central category catalog and technical retention cleanup support.

CREATE TABLE IF NOT EXISTS central_categories (
  category_id text NOT NULL,
  store_id text NOT NULL,
  category_name text NOT NULL,
  category_rule_profile jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (store_id, category_id),
  CONSTRAINT central_categories_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT central_categories_profile_object_check CHECK (jsonb_typeof(category_rule_profile) = 'object')
);

CREATE INDEX IF NOT EXISTS central_categories_store_status_idx
  ON central_categories (store_id, status, category_name);

INSERT INTO central_categories (
  store_id, category_id, category_name, category_rule_profile, status, created_at, updated_at
)
SELECT DISTINCT ON (store_id, category_id)
  store_id,
  category_id,
  category_name,
  category_rule_profile,
  'active',
  min(created_at) OVER (PARTITION BY store_id, category_id),
  max(updated_at) OVER (PARTITION BY store_id, category_id)
FROM central_products
WHERE category_id IS NOT NULL
ORDER BY store_id, category_id, updated_at DESC
ON CONFLICT (store_id, category_id) DO UPDATE SET
  category_name = excluded.category_name,
  category_rule_profile = excluded.category_rule_profile,
  status = 'active',
  updated_at = greatest(central_categories.updated_at, excluded.updated_at);

DO $$
BEGIN
  ALTER TABLE central_products
    ADD CONSTRAINT central_products_category_fkey
    FOREIGN KEY (store_id, category_id)
    REFERENCES central_categories (store_id, category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
