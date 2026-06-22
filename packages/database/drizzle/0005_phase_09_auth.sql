-- Phase 09 closed-pilot authentication and privacy intake.
-- T9-01/T9-02: only irreversible token/password hashes cross the persistence boundary.
-- T9-03/T9-05: account state remains linked to server-owned subject/store membership.

DO $$
BEGIN
  CREATE TYPE auth_account_status AS ENUM (
    'invited', 'active', 'blocked', 'revoked', 'recovery_pending'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS auth_invites (
  invite_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  token_hash text NOT NULL,
  identifier text NOT NULL,
  subject_id text NOT NULL,
  display_name text NOT NULL,
  store_id text NOT NULL,
  store_name text NOT NULL,
  role membership_role NOT NULL,
  status auth_account_status NOT NULL DEFAULT 'invited',
  expires_at timestamptz NOT NULL,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT auth_invites_identifier_length_check CHECK (char_length(identifier) BETWEEN 1 AND 160),
  CONSTRAINT auth_invites_display_name_length_check CHECK (char_length(display_name) BETWEEN 1 AND 240),
  CONSTRAINT auth_invites_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_invites_idempotency_key_uidx
  ON auth_invites (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS auth_invites_token_hash_uidx
  ON auth_invites (token_hash);
CREATE INDEX IF NOT EXISTS auth_invites_subject_store_idx
  ON auth_invites (subject_id, store_id);
CREATE INDEX IF NOT EXISTS auth_invites_identifier_idx
  ON auth_invites (identifier);
CREATE INDEX IF NOT EXISTS auth_invites_expires_status_idx
  ON auth_invites (expires_at, status);

CREATE TABLE IF NOT EXISTS auth_credentials (
  subject_id text NOT NULL,
  store_id text NOT NULL,
  identifier text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  password_algorithm text NOT NULL,
  status auth_account_status NOT NULL DEFAULT 'active',
  password_updated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (subject_id, store_id),
  CONSTRAINT auth_credentials_identifier_length_check CHECK (char_length(identifier) BETWEEN 1 AND 160),
  CONSTRAINT auth_credentials_password_hash_check CHECK (password_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT auth_credentials_password_salt_check CHECK (password_salt ~ '^[0-9a-f]{32}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_credentials_identifier_uidx
  ON auth_credentials (identifier);
CREATE INDEX IF NOT EXISTS auth_credentials_subject_store_status_idx
  ON auth_credentials (subject_id, store_id, status);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id text PRIMARY KEY,
  token_hash text NOT NULL,
  subject_id text NOT NULL,
  store_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from_session_id text,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  CONSTRAINT auth_sessions_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_uidx
  ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_subject_store_revoked_idx
  ON auth_sessions (subject_id, store_id, revoked_at);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_revoked_idx
  ON auth_sessions (expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS auth_recovery_tokens (
  recovery_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  token_hash text NOT NULL,
  subject_id text NOT NULL,
  store_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL,
  CONSTRAINT auth_recovery_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_recovery_tokens_idempotency_key_uidx
  ON auth_recovery_tokens (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS auth_recovery_tokens_token_hash_uidx
  ON auth_recovery_tokens (token_hash);
CREATE INDEX IF NOT EXISTS auth_recovery_tokens_subject_store_idx
  ON auth_recovery_tokens (subject_id, store_id);
CREATE INDEX IF NOT EXISTS auth_recovery_tokens_expires_consumed_idx
  ON auth_recovery_tokens (expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS privacy_requests (
  request_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  subject_id text NOT NULL,
  store_id text NOT NULL,
  request_type text NOT NULL,
  contact_channel text NOT NULL CHECK (contact_channel IN ('email', 'phone')),
  contact_value text NOT NULL,
  data_categories jsonb NOT NULL,
  request_body text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status = 'received'),
  received_at timestamptz NOT NULL,
  CONSTRAINT privacy_requests_contact_length_check CHECK (char_length(contact_value) BETWEEN 1 AND 160),
  CONSTRAINT privacy_requests_body_length_check CHECK (char_length(request_body) BETWEEN 20 AND 2000),
  CONSTRAINT privacy_requests_categories_check CHECK (
    jsonb_typeof(data_categories) = 'array' AND jsonb_array_length(data_categories) BETWEEN 1 AND 8
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS privacy_requests_idempotency_key_uidx
  ON privacy_requests (idempotency_key);
CREATE INDEX IF NOT EXISTS privacy_requests_subject_store_idx
  ON privacy_requests (subject_id, store_id);
CREATE INDEX IF NOT EXISTS privacy_requests_store_received_idx
  ON privacy_requests (store_id, received_at DESC);

COMMENT ON TABLE auth_invites IS
  'Invite-first pilot access. Raw invite tokens are never stored.';
COMMENT ON TABLE auth_credentials IS
  'Salted and peppered password verifiers linked to a subject and store.';
COMMENT ON TABLE auth_sessions IS
  'Revocable pilot sessions. Raw bearer or cookie values are never stored.';
COMMENT ON TABLE auth_recovery_tokens IS
  'One-time password recovery hashes. Raw recovery tokens are never stored.';
COMMENT ON TABLE privacy_requests IS
  'Bounded LGPD rights intake without evidence binaries, device URIs, signed URLs, or secrets.';
