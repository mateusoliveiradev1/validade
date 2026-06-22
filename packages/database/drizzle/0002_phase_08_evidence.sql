-- Phase 08 private evidence metadata.
-- T8-01/T8-06: every lookup is store scoped; only an opaque private object key is stored.
-- T8-07: MIME, size, and SHA-256 metadata are constrained before central acknowledgement.
-- T8-08: device-local paths, payloads, and temporary access links are intentionally absent.
-- T8-05: idempotency prevents duplicate evidence assets during upload replay.

DO $$
BEGIN
  CREATE TYPE evidence_asset_state AS ENUM (
    'upload_requested',
    'uploading',
    'uploaded',
    'failed',
    'invalidated',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS evidence_assets (
  asset_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  local_evidence_id text NOT NULL,
  store_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  target_label text,
  object_key text NOT NULL,
  state evidence_asset_state NOT NULL DEFAULT 'upload_requested',
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-fA-F]{64}$'),
  author_id text NOT NULL,
  author_display_name text NOT NULL,
  author_role_snapshot membership_role NOT NULL,
  captured_at timestamptz NOT NULL,
  upload_requested_at timestamptz NOT NULL DEFAULT now(),
  uploaded_at timestamptz,
  invalidated_at timestamptz,
  invalidated_by text,
  invalidation_reason text,
  replacement_asset_id text,
  retention_days integer NOT NULL DEFAULT 90 CHECK (retention_days > 0),
  retention_expires_at timestamptz NOT NULL,
  expired_at timestamptz,
  last_error text
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_assets_idempotency_key_uidx
  ON evidence_assets (idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_assets_object_key_uidx
  ON evidence_assets (object_key);

CREATE INDEX IF NOT EXISTS evidence_assets_store_target_idx
  ON evidence_assets (store_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS evidence_assets_store_state_idx
  ON evidence_assets (store_id, state);

CREATE INDEX IF NOT EXISTS evidence_assets_retention_idx
  ON evidence_assets (state, retention_expires_at);

COMMENT ON TABLE evidence_assets IS
  'Metadata-only evidence ledger. File content is private in R2; device-local paths and temporary access links are not stored.';

COMMENT ON COLUMN evidence_assets.object_key IS
  'Opaque server-generated private R2 key. Never return through public contracts or logs.';
