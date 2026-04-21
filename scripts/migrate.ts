import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

async function run() {
  console.log(`Running migrations on ${url}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
