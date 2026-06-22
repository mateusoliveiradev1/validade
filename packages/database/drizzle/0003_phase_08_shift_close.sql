-- Phase 08 truthful shift-close snapshots.
-- T8-01: all snapshots and handoffs remain store scoped.
-- T8-04/T8-05: close history is append-only and idempotent.
-- T8-09: safe and unsafe verdicts preserve the evaluated blockers/checklist.

DO $$
BEGIN
  CREATE TYPE shift_close_verdict AS ENUM ('safe', 'unsafe');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE shift_close_eligibility AS ENUM ('eligible_safe', 'must_close_unsafe', 'cannot_evaluate');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS shift_closures (
  closure_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  store_id text NOT NULL,
  store_name text NOT NULL,
  verdict shift_close_verdict NOT NULL,
  eligibility shift_close_eligibility NOT NULL,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor_id text NOT NULL,
  actor_display_name text NOT NULL,
  actor_role_snapshot membership_role NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  rule_version text NOT NULL,
  reason text,
  continuity_owner text,
  continuity_deadline timestamptz,
  note text,
  revision_of_closure_id text,
  reopen_reason text,
  reopen_summary text,
  CONSTRAINT shift_closures_unsafe_continuity_check CHECK (
    verdict <> 'unsafe' OR (
      reason IS NOT NULL AND continuity_owner IS NOT NULL AND
      continuity_deadline IS NOT NULL AND note IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_closures_idempotency_key_uidx
  ON shift_closures (idempotency_key);

CREATE INDEX IF NOT EXISTS shift_closures_store_occurred_idx
  ON shift_closures (store_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS shift_closures_store_verdict_idx
  ON shift_closures (store_id, verdict);

CREATE INDEX IF NOT EXISTS shift_closures_revision_idx
  ON shift_closures (revision_of_closure_id)
  WHERE revision_of_closure_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS shift_handoffs (
  handoff_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  closure_id text NOT NULL REFERENCES shift_closures(closure_id),
  store_id text NOT NULL,
  acknowledged_by text NOT NULL,
  acknowledged_display_name text NOT NULL,
  acknowledged_role_snapshot membership_role NOT NULL,
  acknowledged_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_handoffs_idempotency_key_uidx
  ON shift_handoffs (idempotency_key);

CREATE INDEX IF NOT EXISTS shift_handoffs_closure_idx
  ON shift_handoffs (closure_id);

CREATE INDEX IF NOT EXISTS shift_handoffs_store_acknowledged_idx
  ON shift_handoffs (store_id, acknowledged_at DESC);

CREATE OR REPLACE FUNCTION prevent_shift_closure_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'shift_closures is append-only';
END
$$;

DROP TRIGGER IF EXISTS shift_closures_append_only_guard ON shift_closures;
CREATE TRIGGER shift_closures_append_only_guard
  BEFORE UPDATE OR DELETE ON shift_closures
  FOR EACH ROW EXECUTE FUNCTION prevent_shift_closure_mutation();

CREATE OR REPLACE FUNCTION prevent_shift_handoff_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'shift_handoffs is append-only';
END
$$;

DROP TRIGGER IF EXISTS shift_handoffs_append_only_guard ON shift_handoffs;
CREATE TRIGGER shift_handoffs_append_only_guard
  BEFORE UPDATE OR DELETE ON shift_handoffs
  FOR EACH ROW EXECUTE FUNCTION prevent_shift_handoff_mutation();

COMMENT ON TABLE shift_closures IS
  'Immutable truthful shift-close snapshots. Reopen creates a linked new revision.';

COMMENT ON TABLE shift_handoffs IS
  'Independent acknowledgement of a shift handoff; it never resolves operational work.';
