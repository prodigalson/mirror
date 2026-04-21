import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { ensureSchema } from "./init";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL || process.env.GBRAIN_DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (or GBRAIN_DATABASE_URL) must be set to a Postgres connection string"
    );
  }
  const client = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10 });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});

export { ensureSchema };
