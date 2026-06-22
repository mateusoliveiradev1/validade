-- Phase 08 explicit, versioned membership administration.
-- T8-01/T8-02: store scope and optimistic versioning prevent forged or stale authority changes.
-- T8-04/T8-05: mutation receipts are idempotent and append-only; audit remains the human timeline.

ALTER TABLE store_memberships
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  ALTER TABLE store_memberships
    ADD CONSTRAINT store_memberships_version_positive_check CHECK (version > 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'membership.changed';

CREATE TABLE IF NOT EXISTS membership_mutations (
  idempotency_key text PRIMARY KEY,
  membership_id text NOT NULL,
  store_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('grant', 'change_role', 'revoke')),
  response jsonb NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS membership_mutations_store_occurred_idx
  ON membership_mutations (store_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS membership_mutations_membership_idx
  ON membership_mutations (membership_id);

CREATE OR REPLACE FUNCTION prevent_membership_mutation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'membership_mutations is append-only';
END
$$;

DROP TRIGGER IF EXISTS membership_mutations_append_only_guard ON membership_mutations;
CREATE TRIGGER membership_mutations_append_only_guard
  BEFORE UPDATE OR DELETE ON membership_mutations
  FOR EACH ROW EXECUTE FUNCTION prevent_membership_mutation_mutation();

COMMENT ON TABLE membership_mutations IS
  'Idempotent server-side receipts for explicit membership grants, changes, and revocations.';
