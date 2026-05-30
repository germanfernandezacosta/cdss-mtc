import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/ehr/schema.ts",
  out: "./src/lib/ehr/migrations",
  dbCredentials: {
    url: "./data/ehr/ehr-production.db",
  },
});