-- Phase 17 Controle GPP central persistence.
-- T-17-03/T-17-04/T-17-05: store-scoped GPP facts, idempotent receipts, and audit-ready lifecycle data.

ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'gpp';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'gpp.changed';

DO $$
BEGIN
  CREATE TYPE gpp_quantity_unit AS ENUM ('un', 'kg', 'g', 'l', 'ml', 'caixa', 'pacote');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE gpp_avaria_finality AS ENUM (
    'baixa_gpp',
    'reaproveitamento',
    'producao_interna',
    'transferencia'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE gpp_avaria_status AS ENUM (
    'pendente',
    'divergencia',
    'corrigido',
    'revisado_gpp',
    'baixado',
    'cancelado',
    'estornado',
    'correcao_administrativa'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE gpp_purchase_status AS ENUM (
    'solicitado',
    'atendido',
    'atendido_parcial',
    'sem_produto',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS gpp_avaria_entries (
  avaria_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  store_id text NOT NULL,
  sector text NOT NULL,
  product_code text NOT NULL,
  product_name text NOT NULL,
  quantity_value double precision NOT NULL CHECK (quantity_value > 0),
  quantity_unit gpp_quantity_unit NOT NULL,
  finality gpp_avaria_finality NOT NULL,
  destination text NOT NULL,
  status gpp_avaria_status NOT NULL DEFAULT 'pendente',
  creator_id text NOT NULL,
  creator_display_name text NOT NULL,
  creator_role_snapshot membership_role NOT NULL,
  divergence_reason text,
  correction_justification text,
  baixa_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT gpp_avaria_entries_divergence_reason_check CHECK (
    status <> 'divergencia' OR divergence_reason IS NOT NULL
  ),
  CONSTRAINT gpp_avaria_entries_correction_reason_check CHECK (
    status NOT IN ('corrigido', 'correcao_administrativa') OR correction_justification IS NOT NULL
  ),
  CONSTRAINT gpp_avaria_entries_baixa_time_check CHECK (
    status <> 'baixado' OR baixa_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS gpp_avaria_entries_idempotency_key_uidx
  ON gpp_avaria_entries (idempotency_key);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_status_idx
  ON gpp_avaria_entries (store_id, status);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_sector_idx
  ON gpp_avaria_entries (store_id, sector);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_product_code_idx
  ON gpp_avaria_entries (store_id, product_code);
CREATE INDEX IF NOT EXISTS gpp_avaria_entries_store_updated_idx
  ON gpp_avaria_entries (store_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS gpp_avaria_movements (
  movement_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  avaria_id text NOT NULL,
  store_id text NOT NULL,
  kind gpp_avaria_finality NOT NULL,
  quantity_value double precision NOT NULL CHECK (quantity_value > 0),
  quantity_unit gpp_quantity_unit NOT NULL,
  destination text,
  actor_id text NOT NULL,
  actor_display_name text NOT NULL,
  actor_role_snapshot membership_role NOT NULL,
  justification text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT gpp_avaria_movements_transfer_destination_check CHECK (
    kind <> 'transferencia' OR destination IS NOT NULL
  ),
  CONSTRAINT gpp_avaria_movements_justification_check CHECK (
    kind NOT IN ('baixa_gpp', 'transferencia') OR justification IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS gpp_avaria_movements_idempotency_key_uidx
  ON gpp_avaria_movements (idempotency_key);
CREATE INDEX IF NOT EXISTS gpp_avaria_movements_store_avaria_idx
  ON gpp_avaria_movements (store_id, avaria_id);
CREATE INDEX IF NOT EXISTS gpp_avaria_movements_store_kind_idx
  ON gpp_avaria_movements (store_id, kind);
CREATE INDEX IF NOT EXISTS gpp_avaria_movements_store_occurred_idx
  ON gpp_avaria_movements (store_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS gpp_purchase_requests (
  purchase_request_id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  store_id text NOT NULL,
  sector text NOT NULL,
  product_code text,
  product_name text NOT NULL,
  requested_quantity_value double precision NOT NULL CHECK (requested_quantity_value > 0),
  requested_quantity_unit gpp_quantity_unit NOT NULL,
  attended_product_code text,
  attended_product_name text,
  attended_quantity_value double precision CHECK (
    attended_quantity_value IS NULL OR attended_quantity_value > 0
  ),
  attended_quantity_unit gpp_quantity_unit,
  finality text NOT NULL,
  requested_by text NOT NULL,
  requester_display_name text NOT NULL,
  requester_role_snapshot membership_role NOT NULL,
  status gpp_purchase_status NOT NULL DEFAULT 'solicitado',
  exception_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  requested_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT gpp_purchase_requests_attended_product_check CHECK (
    status NOT IN ('atendido', 'atendido_parcial') OR (
      attended_product_code IS NOT NULL AND
      attended_product_name IS NOT NULL AND
      attended_quantity_value IS NOT NULL AND
      attended_quantity_unit IS NOT NULL
    )
  ),
  CONSTRAINT gpp_purchase_requests_exception_reason_check CHECK (
    status NOT IN ('atendido_parcial', 'sem_produto', 'cancelado') OR exception_reason IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS gpp_purchase_requests_idempotency_key_uidx
  ON gpp_purchase_requests (idempotency_key);
CREATE INDEX IF NOT EXISTS gpp_purchase_requests_store_status_idx
  ON gpp_purchase_requests (store_id, status);
CREATE INDEX IF NOT EXISTS gpp_purchase_requests_store_sector_idx
  ON gpp_purchase_requests (store_id, sector);
CREATE INDEX IF NOT EXISTS gpp_purchase_requests_store_product_code_idx
  ON gpp_purchase_requests (store_id, product_code);
CREATE INDEX IF NOT EXISTS gpp_purchase_requests_store_requested_idx
  ON gpp_purchase_requests (store_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS gpp_mutation_receipts (
  idempotency_key text PRIMARY KEY,
  store_id text NOT NULL,
  operation text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT gpp_mutation_receipts_response_check CHECK (jsonb_typeof(response) = 'object')
);

CREATE INDEX IF NOT EXISTS gpp_mutation_receipts_store_operation_idx
  ON gpp_mutation_receipts (store_id, operation);
CREATE INDEX IF NOT EXISTS gpp_mutation_receipts_store_target_idx
  ON gpp_mutation_receipts (store_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS gpp_mutation_receipts_store_created_idx
  ON gpp_mutation_receipts (store_id, created_at DESC);

COMMENT ON TABLE gpp_avaria_entries IS
  'Store-scoped Controle GPP avaria facts. Avaria is the primary record; perda is modeled as reason/finality outside this table.';
COMMENT ON TABLE gpp_avaria_movements IS
  'Linked GPP movements for baixa, reaproveitamento, producao interna, and transferencia. Saldo is computed by repository logic.';
COMMENT ON TABLE gpp_purchase_requests IS
  'Separate compras internas flow. These requests do not resolve validity risk or hide avaria.';
COMMENT ON TABLE gpp_mutation_receipts IS
  'Idempotent Controle GPP mutation receipts for replay without duplicated side effects or audit events.';
