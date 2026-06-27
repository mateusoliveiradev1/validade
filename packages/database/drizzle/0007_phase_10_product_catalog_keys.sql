-- T10-02: central product duplicate prevention is store-scoped by normalized key.

ALTER TABLE central_products ADD COLUMN IF NOT EXISTS normalized_key text;

UPDATE central_products
SET normalized_key = lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))
WHERE normalized_key IS NULL OR trim(normalized_key) = '';

ALTER TABLE central_products ALTER COLUMN normalized_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS central_products_store_normalized_key_uidx
  ON central_products (store_id, normalized_key);
