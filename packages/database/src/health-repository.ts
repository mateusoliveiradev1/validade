import { neon } from "@neondatabase/serverless";

const EXPECTED_TABLES = [
  "audit_events",
  "auth_credentials",
  "auth_login_attempts",
  "auth_sessions",
  "central_categories",
  "central_device_snapshots",
  "central_lots",
  "central_observations",
  "central_product_drafts",
  "central_products",
  "central_projected_tasks",
  "central_sync_commands",
  "central_sync_conflicts",
  "evidence_assets",
  "store_memberships",
] as const;

const EXPECTED_COLUMNS = [
  { tableName: "central_products", columnName: "normalized_key" },
  { tableName: "central_product_drafts", columnName: "review_status" },
  { tableName: "auth_login_attempts", columnName: "identifier_hash" },
] as const;

export interface DatabaseHealthCheckResult {
  ok: boolean;
  checkedAt: string;
  missingTables: string[];
  missingColumns: string[];
}

export async function checkDatabaseHealth(input: {
  connectionString: string;
  checkedAt: Date;
}): Promise<DatabaseHealthCheckResult> {
  const sql = neon(input.connectionString);
  const tableRows = (await sql.query(
    `select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any($1::text[])`,
    [[...EXPECTED_TABLES]],
  )) as Array<{ table_name: string }>;
  const presentTables = new Set(tableRows.map((row) => row.table_name));
  const missingTables = EXPECTED_TABLES.filter((tableName) => !presentTables.has(tableName));

  const columnRows = (await sql.query(
    `select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any($1::text[])`,
    [[...new Set(EXPECTED_COLUMNS.map((column) => column.tableName))]],
  )) as Array<{ table_name: string; column_name: string }>;
  const presentColumns = new Set(columnRows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = EXPECTED_COLUMNS.filter(
    (column) => !presentColumns.has(`${column.tableName}.${column.columnName}`),
  ).map((column) => `${column.tableName}.${column.columnName}`);

  return {
    ok: missingTables.length === 0 && missingColumns.length === 0,
    checkedAt: input.checkedAt.toISOString(),
    missingTables,
    missingColumns,
  };
}
