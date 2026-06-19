import {
  CaptureLotInputSchema,
  CaptureProductInputSchema,
  OperationalLocationSchema,
  PhysicalObservationInputSchema,
  type CaptureLotInput,
  type CaptureProductInput,
  type OperationalLocation,
  type PhysicalObservationInput,
} from "@validade-zero/contracts";
import * as SQLite from "expo-sqlite";
import type {
  CaptureLotDetail,
  CaptureLotSnapshot,
  CaptureObservationRecord,
  CaptureProductRecord,
  CaptureRepository,
  CaptureRepositoryDependencies,
  RecentLotsQuery,
  SaveLotInput,
} from "./repository";
import {
  createInitialObservation,
  nextGeneratedId,
  normalizeProductLookup,
  parseLotId,
  parseLotInput,
  parseObservationInput,
  parseProductInput,
  parseRecentLotsQuery,
} from "./repository";

interface ProductRow {
  id: string;
  display_name: string;
  normalized_name: string;
  category_id: string;
  category_profile_json: string;
  supplier_name: string | null;
  gtin: string | null;
  product_override_json: string | null;
  created_at: string;
}

interface LotRow {
  id: string;
  product_id: string;
  product_display_name: string;
  identity_source: string;
  identity_value: string;
  mode: string;
  expires_at: string | null;
  received_at: string | null;
  quality_inspection_due_at: string | null;
  quality_window_days: number | null;
  approximate_quantity: number;
  initial_location_kind: string;
  initial_location_custom_name: string | null;
  current_observation_id: string;
  current_status: string;
  current_actor_label: string;
  current_occurred_at: string;
  current_location_kind: string;
  current_location_custom_name: string | null;
  current_quantity_state: string;
  current_approximate_quantity: number | null;
  current_is_correction: number;
  current_correction_reason: string | null;
}

interface ObservationRow {
  id: string;
  lot_id: string;
  status: string;
  actor_label: string;
  occurred_at: string;
  location_kind: string;
  location_custom_name: string | null;
  quantity_state: string;
  approximate_quantity: number | null;
  is_correction: number;
  correction_reason: string | null;
}

const LOT_SELECT = `
  SELECT
    l.id,
    l.product_id,
    p.display_name AS product_display_name,
    l.identity_source,
    l.identity_value,
    l.mode,
    l.expires_at,
    l.received_at,
    l.quality_inspection_due_at,
    l.quality_window_days,
    l.approximate_quantity,
    l.initial_location_kind,
    l.initial_location_custom_name,
    l.current_observation_id,
    l.current_status,
    l.current_actor_label,
    l.current_occurred_at,
    l.current_location_kind,
    l.current_location_custom_name,
    l.current_quantity_state,
    l.current_approximate_quantity,
    l.current_is_correction,
    l.current_correction_reason
  FROM capture_lots l
  INNER JOIN capture_products p ON p.id = l.product_id
`;

export function createSQLiteCaptureRepository(
  dependencies: CaptureRepositoryDependencies,
  databaseName = "validade-zero-capture.db",
): CaptureRepository {
  let database: SQLite.SQLiteDatabase | undefined;
  let initialization: Promise<void> | undefined;

  async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    database ??= await SQLite.openDatabaseAsync(databaseName);

    return database;
  }

  async function initialize(): Promise<void> {
    initialization ??= initializeDatabase(getDatabase);

    return initialization;
  }

  async function createProduct(input: CaptureProductInput): Promise<CaptureProductRecord> {
    await initialize();
    const product = parseProductInput(input);
    const normalizedName = normalizeProductLookup(product.displayName);
    const db = await getDatabase();
    const existing = await findExistingProduct(db, normalizedName, product.gtin);

    if (existing !== null) {
      return mapProduct(existing);
    }

    const record: CaptureProductRecord = {
      ...product,
      id: nextGeneratedId(dependencies),
      normalizedName,
      createdAt: dependencies.clock(),
    };

    await db.runAsync(
      `INSERT INTO capture_products (
        id, display_name, normalized_name, category_id, category_profile_json,
        supplier_name, gtin, product_override_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id,
      record.displayName,
      record.normalizedName,
      record.categoryId,
      JSON.stringify(record.categoryRuleProfile),
      record.supplierName ?? null,
      record.gtin ?? null,
      record.productRuleOverride === undefined ? null : JSON.stringify(record.productRuleOverride),
      record.createdAt,
    );

    return record;
  }

  async function findProducts(query: string): Promise<readonly CaptureProductRecord[]> {
    await initialize();
    const normalizedQuery = normalizeProductLookup(query);

    if (normalizedQuery.length === 0) {
      return [];
    }

    const db = await getDatabase();
    const rows = await db.getAllAsync<ProductRow>(
      `SELECT * FROM capture_products
       WHERE normalized_name LIKE ? OR gtin LIKE ?
       ORDER BY display_name COLLATE NOCASE ASC`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
    );

    return rows.map(mapProduct);
  }

  async function saveLot(input: SaveLotInput): Promise<CaptureLotSnapshot> {
    await initialize();
    const lot = parseLotInput(input.lot);
    const db = await getDatabase();
    const productRow = await db.getFirstAsync<ProductRow>(
      "SELECT * FROM capture_products WHERE id = ?",
      lot.productId,
    );

    if (productRow === null) {
      throw new Error(`Cannot save a lot for an unknown product: ${lot.productId}`);
    }

    const product = mapProduct(productRow);
    const lotId = nextGeneratedId(dependencies);
    const observation: CaptureObservationRecord = {
      ...createInitialObservation(lot, input.actorLabel, dependencies.clock()),
      id: nextGeneratedId(dependencies),
      lotId,
    };
    const snapshot: CaptureLotSnapshot = {
      ...lot,
      id: lotId,
      productDisplayName: product.displayName,
      currentObservation: observation,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO capture_lots (
          id, product_id, identity_source, identity_value, mode, expires_at, received_at,
          quality_inspection_due_at, quality_window_days, approximate_quantity,
          initial_location_kind, initial_location_custom_name, current_observation_id,
          current_status, current_actor_label, current_occurred_at, current_location_kind,
          current_location_custom_name, current_quantity_state, current_approximate_quantity,
          current_is_correction, current_correction_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        lotId,
        lot.productId,
        lot.identity.identitySource,
        lot.identity.value,
        lot.mode,
        lot.mode === "formal_validity" ? lot.expiresAt : null,
        lot.mode === "formal_validity" ||
          lot.mode === "flv_inspection" ||
          lot.mode === "receiving_monitored"
          ? (lot.receivedAt ?? null)
          : null,
        lot.mode === "flv_inspection" ? (lot.qualityInspectionDueAt ?? null) : null,
        lot.mode === "flv_inspection" ? (lot.qualityWindowDays ?? null) : null,
        lot.approximateQuantity,
        lot.initialLocation.kind,
        lot.initialLocation.kind === "other" ? lot.initialLocation.customName : null,
        observation.id,
        observation.status,
        observation.actorLabel,
        observation.occurredAt,
        observation.location.kind,
        observation.location.kind === "other" ? observation.location.customName : null,
        observation.quantityState,
        observation.quantityState === "estimated" ? observation.approximateQuantity : null,
        observation.isCorrection ? 1 : 0,
        observation.correctionReason ?? null,
      );
      await insertObservation(db, observation);
    });

    return snapshot;
  }

  async function appendObservation(
    lotId: string,
    input: PhysicalObservationInput,
  ): Promise<CaptureObservationRecord> {
    await initialize();
    const validatedLotId = parseLotId(lotId);
    const observation: CaptureObservationRecord = {
      ...parseObservationInput(input),
      id: nextGeneratedId(dependencies),
      lotId: validatedLotId,
    };
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM capture_lots WHERE id = ?",
        validatedLotId,
      );

      if (existing === null) {
        throw new Error(`Cannot append an observation for an unknown lot: ${validatedLotId}`);
      }

      await insertObservation(db, observation);
      await db.runAsync(
        `UPDATE capture_lots SET
          current_observation_id = ?, current_status = ?, current_actor_label = ?,
          current_occurred_at = ?, current_location_kind = ?, current_location_custom_name = ?,
          current_quantity_state = ?, current_approximate_quantity = ?, current_is_correction = ?,
          current_correction_reason = ?
        WHERE id = ?`,
        observation.id,
        observation.status,
        observation.actorLabel,
        observation.occurredAt,
        observation.location.kind,
        observation.location.kind === "other" ? observation.location.customName : null,
        observation.quantityState,
        observation.quantityState === "estimated" ? observation.approximateQuantity : null,
        observation.isCorrection ? 1 : 0,
        observation.correctionReason ?? null,
        validatedLotId,
      );
    });

    return observation;
  }

  async function listRecentLots(query?: RecentLotsQuery): Promise<readonly CaptureLotSnapshot[]> {
    await initialize();
    const parsedQuery = parseRecentLotsQuery(query);
    const db = await getDatabase();
    const limit = parsedQuery.limit ?? 20;
    const normalizedQuery =
      parsedQuery.query === undefined
        ? undefined
        : `%${normalizeProductLookup(parsedQuery.query)}%`;
    const location = parsedQuery.location;
    let rows: LotRow[];

    if (normalizedQuery !== undefined && location !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE (p.normalized_name LIKE ? OR p.gtin LIKE ? OR l.identity_value LIKE ?)
           AND l.current_location_kind = ?
           AND (l.current_location_kind <> 'other' OR l.current_location_custom_name = ?)
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        location.kind,
        location.kind === "other" ? location.customName : null,
        limit,
      );
    } else if (normalizedQuery !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE p.normalized_name LIKE ? OR p.gtin LIKE ? OR l.identity_value LIKE ?
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        limit,
      );
    } else if (location !== undefined) {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT}
         WHERE l.current_location_kind = ?
           AND (l.current_location_kind <> 'other' OR l.current_location_custom_name = ?)
         ORDER BY l.current_occurred_at DESC LIMIT ?`,
        location.kind,
        location.kind === "other" ? location.customName : null,
        limit,
      );
    } else {
      rows = await db.getAllAsync<LotRow>(
        `${LOT_SELECT} ORDER BY l.current_occurred_at DESC LIMIT ?`,
        limit,
      );
    }

    return rows.map(mapLotSnapshot);
  }

  async function loadLotDetail(lotId: string): Promise<CaptureLotDetail | null> {
    await initialize();
    const validatedLotId = parseLotId(lotId);
    const db = await getDatabase();
    const lotRow = await db.getFirstAsync<LotRow>(`${LOT_SELECT} WHERE l.id = ?`, validatedLotId);

    if (lotRow === null) {
      return null;
    }

    const snapshot = mapLotSnapshot(lotRow);
    const productRow = await db.getFirstAsync<ProductRow>(
      "SELECT * FROM capture_products WHERE id = ?",
      snapshot.productId,
    );

    if (productRow === null) {
      throw new Error(`Lot ${validatedLotId} has no stored product.`);
    }

    const observationRows = await db.getAllAsync<ObservationRow>(
      "SELECT * FROM capture_observations WHERE lot_id = ? ORDER BY occurred_at ASC",
      validatedLotId,
    );

    return {
      ...snapshot,
      product: mapProduct(productRow),
      observations: observationRows.map(mapObservation),
    };
  }

  return {
    initialize,
    createProduct,
    findProducts,
    saveLot,
    appendObservation,
    listRecentLots,
    loadLotDetail,
  };
}

async function initializeDatabase(
  getDatabase: () => Promise<SQLite.SQLiteDatabase>,
): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS capture_products (
      id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      category_profile_json TEXT NOT NULL,
      supplier_name TEXT,
      gtin TEXT,
      product_override_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS capture_lots (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      identity_source TEXT NOT NULL,
      identity_value TEXT NOT NULL,
      mode TEXT NOT NULL,
      expires_at TEXT,
      received_at TEXT,
      quality_inspection_due_at TEXT,
      quality_window_days INTEGER,
      approximate_quantity REAL NOT NULL,
      initial_location_kind TEXT NOT NULL,
      initial_location_custom_name TEXT,
      current_observation_id TEXT NOT NULL,
      current_status TEXT NOT NULL,
      current_actor_label TEXT NOT NULL,
      current_occurred_at TEXT NOT NULL,
      current_location_kind TEXT NOT NULL,
      current_location_custom_name TEXT,
      current_quantity_state TEXT NOT NULL,
      current_approximate_quantity REAL,
      current_is_correction INTEGER NOT NULL,
      current_correction_reason TEXT,
      FOREIGN KEY (product_id) REFERENCES capture_products(id)
    );
    CREATE TABLE IF NOT EXISTS capture_observations (
      id TEXT PRIMARY KEY NOT NULL,
      lot_id TEXT NOT NULL,
      status TEXT NOT NULL,
      actor_label TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      location_kind TEXT NOT NULL,
      location_custom_name TEXT,
      quantity_state TEXT NOT NULL,
      approximate_quantity REAL,
      is_correction INTEGER NOT NULL,
      correction_reason TEXT,
      FOREIGN KEY (lot_id) REFERENCES capture_lots(id)
    );
    CREATE INDEX IF NOT EXISTS capture_products_normalized_name_idx
      ON capture_products(normalized_name);
    CREATE INDEX IF NOT EXISTS capture_products_gtin_idx ON capture_products(gtin);
    CREATE INDEX IF NOT EXISTS capture_lots_identity_value_idx ON capture_lots(identity_value);
    CREATE INDEX IF NOT EXISTS capture_observations_lot_occurred_at_idx
      ON capture_observations(lot_id, occurred_at DESC);
  `);
}

async function findExistingProduct(
  db: SQLite.SQLiteDatabase,
  normalizedName: string,
  gtin: string | undefined,
): Promise<ProductRow | null> {
  if (gtin === undefined) {
    return db.getFirstAsync<ProductRow>(
      "SELECT * FROM capture_products WHERE normalized_name = ?",
      normalizedName,
    );
  }

  return db.getFirstAsync<ProductRow>(
    "SELECT * FROM capture_products WHERE normalized_name = ? OR gtin = ?",
    normalizedName,
    gtin,
  );
}

async function insertObservation(
  db: SQLite.SQLiteDatabase,
  observation: CaptureObservationRecord,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO capture_observations (
      id, lot_id, status, actor_label, occurred_at, location_kind, location_custom_name,
      quantity_state, approximate_quantity, is_correction, correction_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    observation.id,
    observation.lotId,
    observation.status,
    observation.actorLabel,
    observation.occurredAt,
    observation.location.kind,
    observation.location.kind === "other" ? observation.location.customName : null,
    observation.quantityState,
    observation.quantityState === "estimated" ? observation.approximateQuantity : null,
    observation.isCorrection ? 1 : 0,
    observation.correctionReason ?? null,
  );
}

function mapProduct(row: ProductRow): CaptureProductRecord {
  const product = CaptureProductInputSchema.parse({
    displayName: row.display_name,
    categoryId: row.category_id,
    categoryRuleProfile: parseJson(row.category_profile_json),
    ...(row.supplier_name === null ? {} : { supplierName: row.supplier_name }),
    ...(row.gtin === null ? {} : { gtin: row.gtin }),
    ...(row.product_override_json === null
      ? {}
      : { productRuleOverride: parseJson(row.product_override_json) }),
  });

  return {
    ...product,
    id: row.id,
    normalizedName: row.normalized_name,
    createdAt: row.created_at,
  };
}

function mapLotSnapshot(row: LotRow): CaptureLotSnapshot {
  const initialLocation = mapLocation(row.initial_location_kind, row.initial_location_custom_name);
  const lot = parseStoredLot(row, initialLocation);
  const currentObservation = mapObservation({
    id: row.current_observation_id,
    lot_id: row.id,
    status: row.current_status,
    actor_label: row.current_actor_label,
    occurred_at: row.current_occurred_at,
    location_kind: row.current_location_kind,
    location_custom_name: row.current_location_custom_name,
    quantity_state: row.current_quantity_state,
    approximate_quantity: row.current_approximate_quantity,
    is_correction: row.current_is_correction,
    correction_reason: row.current_correction_reason,
  });

  return {
    ...lot,
    id: row.id,
    productDisplayName: row.product_display_name,
    currentObservation,
  };
}

function parseStoredLot(row: LotRow, initialLocation: OperationalLocation): CaptureLotInput {
  const base = {
    productId: row.product_id,
    identity: {
      identitySource: row.identity_source,
      value: row.identity_value,
    },
    approximateQuantity: row.approximate_quantity,
    initialLocation,
  };

  if (row.mode === "formal_validity") {
    return CaptureLotInputSchema.parse({
      ...base,
      mode: row.mode,
      expiresAt: row.expires_at,
      ...(row.received_at === null ? {} : { receivedAt: row.received_at }),
    });
  }

  if (row.mode === "flv_inspection") {
    return CaptureLotInputSchema.parse({
      ...base,
      mode: row.mode,
      receivedAt: row.received_at,
      ...(row.quality_inspection_due_at === null
        ? {}
        : { qualityInspectionDueAt: row.quality_inspection_due_at }),
      ...(row.quality_window_days === null ? {} : { qualityWindowDays: row.quality_window_days }),
    });
  }

  return CaptureLotInputSchema.parse({
    ...base,
    mode: "receiving_monitored",
    receivedAt: row.received_at,
  });
}

function mapObservation(row: ObservationRow): CaptureObservationRecord {
  const observation = PhysicalObservationInputSchema.parse({
    status: row.status,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    location: mapLocation(row.location_kind, row.location_custom_name),
    quantityState: row.quantity_state,
    ...(row.quantity_state === "estimated"
      ? { approximateQuantity: row.approximate_quantity }
      : {}),
    isCorrection: row.is_correction === 1,
    ...(row.correction_reason === null ? {} : { correctionReason: row.correction_reason }),
  });

  return { ...observation, id: row.id, lotId: row.lot_id };
}

function mapLocation(kind: string, customName: string | null): OperationalLocation {
  return OperationalLocationSchema.parse(kind === "other" ? { kind, customName } : { kind });
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}
