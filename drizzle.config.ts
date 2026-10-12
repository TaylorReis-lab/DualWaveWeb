import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Mesma prioridade da execução local: ambiente > .env.local > .env.
const mode = process.env.NODE_ENV === "production" ? "production" : "development";
config({
  path: [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"],
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não definido. Configure-o no .env antes de executar drizzle-kit.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
});
