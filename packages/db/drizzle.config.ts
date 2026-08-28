import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://dentivohq:dentivohq@localhost:5432/dentivohq" },
  strict: true,
  verbose: true
});
