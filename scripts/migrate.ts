import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL || process.env.GBRAIN_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or GBRAIN_DATABASE_URL) not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

async function run() {
  console.log(`Running migrations on ${url!.replace(/:[^@]+@/, ":***@")}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied");
  await sql.end();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
