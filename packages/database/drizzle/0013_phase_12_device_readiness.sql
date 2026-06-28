-- T12-01: enrich central device snapshots with public-safe pilot readiness metadata.
-- Raw Expo push tokens, device serials, private build URLs, and evidence material stay out of
-- Command Center-readable rows.

ALTER TABLE central_device_snapshots
  ADD COLUMN IF NOT EXISTS device_label text,
  ADD COLUMN IF NOT EXISTS active_user_label text,
  ADD COLUMN IF NOT EXISTS store_name text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS app_build text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS api_target text,
  ADD COLUMN IF NOT EXISTS last_foreground_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_permission text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS push_provider_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS camera_permission text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS readiness_verdict text,
  ADD COLUMN IF NOT EXISTS readiness_blockers jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS central_device_snapshots_store_readiness_idx
  ON central_device_snapshots (store_id, readiness_verdict, updated_at DESC);

CREATE INDEX IF NOT EXISTS central_device_snapshots_store_central_read_idx
  ON central_device_snapshots (store_id, last_central_read_at DESC NULLS LAST);

COMMENT ON COLUMN central_device_snapshots.device_label IS
  'Human-readable device label for pilot operations; not a raw serial.';
COMMENT ON COLUMN central_device_snapshots.active_user_label IS
  'Last active user label captured from an authenticated same-store prepare-turn.';
COMMENT ON COLUMN central_device_snapshots.readiness_blockers IS
  'Public-safe readiness causes and next actions. Raw tokens, device IDs, URLs, and photos are intentionally absent.';
