-- Phase 10 global category catalog.
-- T10-P3: categories are one shared catalog used by all stores; products and lots remain store-scoped.

CREATE TABLE IF NOT EXISTS central_category_catalog (
  category_id text PRIMARY KEY,
  category_name text NOT NULL,
  category_rule_profile jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_category_catalog_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT central_category_catalog_profile_object_check CHECK (jsonb_typeof(category_rule_profile) = 'object')
);

CREATE INDEX IF NOT EXISTS central_category_catalog_status_name_idx
  ON central_category_catalog (status, category_name);

WITH category_sources AS (
  SELECT
    category_id,
    category_name,
    category_rule_profile,
    status,
    created_at,
    updated_at
  FROM central_categories
  UNION ALL
  SELECT
    category_id,
    category_name,
    category_rule_profile,
    'active',
    created_at,
    updated_at
  FROM central_products
),
ranked_categories AS (
  SELECT
    category_id,
    category_name,
    category_rule_profile,
    status,
    min(created_at) OVER (PARTITION BY category_id) AS created_at,
    max(updated_at) OVER (PARTITION BY category_id) AS updated_at,
    row_number() OVER (
      PARTITION BY category_id
      ORDER BY (status = 'active') DESC, updated_at DESC, category_name ASC
    ) AS rank
  FROM category_sources
  WHERE category_id IS NOT NULL
)
INSERT INTO central_category_catalog (
  category_id, category_name, category_rule_profile, status, created_at, updated_at
)
SELECT
  category_id,
  category_name,
  category_rule_profile,
  'active',
  created_at,
  updated_at
FROM ranked_categories
WHERE rank = 1
ON CONFLICT (category_id) DO UPDATE SET
  category_name = excluded.category_name,
  category_rule_profile = excluded.category_rule_profile,
  status = 'active',
  updated_at = greatest(central_category_catalog.updated_at, excluded.updated_at);

ALTER TABLE central_products
  DROP CONSTRAINT IF EXISTS central_products_category_fkey;

DO $$
BEGIN
  ALTER TABLE central_products
    ADD CONSTRAINT central_products_category_catalog_fkey
    FOREIGN KEY (category_id)
    REFERENCES central_category_catalog (category_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
    NOT VALID;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE central_products
  VALIDATE CONSTRAINT central_products_category_catalog_fkey;

UPDATE central_categories
   SET status = 'archived',
       updated_at = now()
 WHERE status = 'active';

COMMENT ON TABLE central_category_catalog IS
  'Shared operational category catalog used by every store. Store-scoped product, lot, task and audit rows keep tenant isolation.';

COMMENT ON TABLE central_categories IS
  'Legacy store-scoped category snapshots kept only for audit/backfill history after central_category_catalog became the active source.';
