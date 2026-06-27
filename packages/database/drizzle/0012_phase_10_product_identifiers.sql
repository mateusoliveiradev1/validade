DO $$ BEGIN
  CREATE TYPE product_identifier_type AS ENUM (
    'gtin',
    'ean',
    'barcode',
    'plu',
    'internal',
    'supplier_code'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS central_product_identifiers (
  identifier_id text PRIMARY KEY,
  store_id text NOT NULL,
  central_product_id text NOT NULL,
  identifier_type product_identifier_type NOT NULL,
  identifier_value text NOT NULL,
  normalized_value text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'central',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT central_product_identifiers_status_check
    CHECK (status IN ('active', 'archived')),
  CONSTRAINT central_product_identifiers_source_check
    CHECK (source IN ('central', 'scan', 'manual', 'migration'))
);

CREATE INDEX IF NOT EXISTS central_product_identifiers_product_idx
  ON central_product_identifiers (store_id, central_product_id);

CREATE INDEX IF NOT EXISTS central_product_identifiers_lookup_idx
  ON central_product_identifiers (store_id, identifier_type, normalized_value);

CREATE UNIQUE INDEX IF NOT EXISTS central_product_identifiers_active_uidx
  ON central_product_identifiers (store_id, identifier_type, normalized_value)
  WHERE status = 'active';

INSERT INTO central_product_identifiers (
  identifier_id,
  store_id,
  central_product_id,
  identifier_type,
  identifier_value,
  normalized_value,
  status,
  source,
  is_primary,
  created_at,
  updated_at
)
SELECT
  'pid_' || md5(store_id || ':' || central_product_id || ':gtin:' || gtin),
  store_id,
  central_product_id,
  'gtin'::product_identifier_type,
  gtin,
  lower(trim(gtin)),
  'active',
  'migration',
  true,
  created_at,
  updated_at
FROM central_products
WHERE gtin IS NOT NULL
ON CONFLICT DO NOTHING;
