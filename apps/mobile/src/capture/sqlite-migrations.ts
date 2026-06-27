interface TableInfoRow {
  name: string;
}

export interface SchemaMigrationDatabase {
  getAllAsync<T>(query: string): Promise<T[]>;
  execAsync(source: string): Promise<void>;
}

const TODAY_TASK_MARKDOWN_COLUMNS = [
  { name: "markdown_workflow_id", definition: "TEXT" },
  { name: "markdown_stage", definition: "TEXT" },
] as const;

const TODAY_TASK_SYNC_COLUMNS = [{ name: "sync_json", definition: "TEXT" }] as const;

const PRODUCT_CATALOG_COLUMNS = [
  { name: "category_name", definition: "TEXT" },
  { name: "central_product_id", definition: "TEXT" },
  { name: "catalog_source", definition: "TEXT" },
  { name: "review_status", definition: "TEXT" },
  { name: "central_sync_state", definition: "TEXT" },
  { name: "draft_id", definition: "TEXT" },
  { name: "draft_review_message", definition: "TEXT" },
  { name: "similar_candidate_count", definition: "INTEGER" },
] as const;

async function ensureColumns(
  db: SchemaMigrationDatabase,
  tableName: string,
  targetColumns: readonly { name: string; definition: string }[],
): Promise<void> {
  const existingRows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${tableName})`);
  const existingColumns = new Set(existingRows.map((column) => column.name));

  for (const column of targetColumns) {
    if (existingColumns.has(column.name)) {
      continue;
    }

    await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.definition};`);
    existingColumns.add(column.name);
  }
}

export async function ensureTodayTaskMarkdownColumns(db: SchemaMigrationDatabase): Promise<void> {
  await ensureColumns(db, "today_tasks", TODAY_TASK_MARKDOWN_COLUMNS);
}

export async function ensureTodayTaskSyncColumns(db: SchemaMigrationDatabase): Promise<void> {
  await ensureColumns(db, "today_tasks", TODAY_TASK_SYNC_COLUMNS);
}

export async function ensureProductCatalogColumns(db: SchemaMigrationDatabase): Promise<void> {
  await ensureColumns(db, "capture_products", PRODUCT_CATALOG_COLUMNS);
}
