import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.NEON_DATABASE_URL ?? "postgres://example.invalid/neondb";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: false,
  strict: true,
});
