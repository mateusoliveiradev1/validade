-- Phase 08 identity and audit foundation.
-- T8-01: every protected read/write must carry store_id and be indexed for scoped access.
-- T8-04: audit_events are append-only; corrections are represented as new events.
-- T8-05: idempotency_key prevents duplicate events during retries/replay.

DO $$
BEGIN
  CREATE TYPE membership_role AS ENUM ('collaborator', 'lead', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE audit_event_type AS ENUM (
    'access.denied',
    'task.changed',
    'markdown.changed',
    'sync.changed',
    'evidence.changed',
    'shift.changed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS store_memberships (
  membership_id text PRIMARY KEY,
  subject_id text NOT NULL,
  actor_display_name text NOT NULL,
  role membership_role NOT NULL,
  store_id text NOT NULL,
  store_name text NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_memberships_active_subject_store_role_uidx
  ON store_memberships (subject_id, store_id, role)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS store_memberships_subject_store_status_idx
  ON store_memberships (subject_id, store_id, status);

CREATE INDEX IF NOT EXISTS store_memberships_store_role_idx
  ON store_memberships (store_id, role);

CREATE TABLE IF NOT EXISTS audit_events (
  event_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  type audit_event_type NOT NULL,
  store_id text NOT NULL,
  actor_id text NOT NULL,
  actor_display_name text NOT NULL,
  actor_role_snapshot membership_role NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  summary text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sanitized boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_events_idempotency_key_uidx
  ON audit_events (idempotency_key);

CREATE INDEX IF NOT EXISTS audit_events_store_occurred_idx
  ON audit_events (store_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_target_occurred_idx
  ON audit_events (target_type, target_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_actor_type_idx
  ON audit_events (actor_id, type);

CREATE INDEX IF NOT EXISTS audit_events_subject_store_status_idx
  ON audit_events (actor_id, store_id, sanitized);

CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only; insert a compensating event instead';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_append_only_guard ON audit_events;

CREATE TRIGGER audit_events_append_only_guard
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_mutation();
