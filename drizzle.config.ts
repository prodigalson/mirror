import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL || process.env.GBRAIN_DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
