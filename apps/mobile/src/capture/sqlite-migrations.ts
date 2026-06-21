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

export async function ensureTodayTaskMarkdownColumns(db: SchemaMigrationDatabase): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>("PRAGMA table_info(today_tasks)");
  const existingColumns = new Set(columns.map((column) => column.name));

  for (const column of TODAY_TASK_MARKDOWN_COLUMNS) {
    if (existingColumns.has(column.name)) {
      continue;
    }

    await db.execAsync(`ALTER TABLE today_tasks ADD COLUMN ${column.name} ${column.definition};`);
    existingColumns.add(column.name);
  }
}
