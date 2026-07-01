CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  subject_id text NOT NULL,
  store_id text NOT NULL,
  flow_id text NOT NULL,
  version text NOT NULL,
  status text NOT NULL,
  completed_at timestamptz,
  skipped_at timestamptz,
  device_id text,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (subject_id, store_id, flow_id, version),
  CONSTRAINT user_onboarding_progress_status_check
    CHECK (status IN ('completed', 'skipped')),
  CONSTRAINT user_onboarding_progress_terminal_timestamp_check
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL AND skipped_at IS NULL) OR
      (status = 'skipped' AND skipped_at IS NOT NULL AND completed_at IS NULL)
    ),
  CONSTRAINT user_onboarding_progress_account_fkey
    FOREIGN KEY (subject_id, store_id)
    REFERENCES auth_credentials (subject_id, store_id)
);

CREATE INDEX IF NOT EXISTS user_onboarding_progress_store_status_idx
  ON user_onboarding_progress (store_id, status, updated_at DESC);
