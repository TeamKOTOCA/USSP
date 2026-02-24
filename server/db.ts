import { drizzle } from "drizzle-orm/node-postgres";
import {
  drizzle as drizzleSqlite,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

type AppDatabase = BetterSQLite3Database<typeof schema>;

const { Pool } = pg;

let db: AppDatabase;
let pool: InstanceType<typeof Pool> | undefined;

// ローカル開発環境はSQLiteを使用
if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqliteDb = new Database(path.join(dbDir, "ussp.db"));
  sqliteDb.pragma("journal_mode = WAL");

  db = drizzleSqlite(sqliteDb, { schema });

  console.log("[DB] Using SQLite for local development");
} else if (process.env.DATABASE_URL) {
  // 本番環境またはPostgreSQL指定時
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema }) as unknown as AppDatabase;

  console.log("[DB] Using PostgreSQL");
} else {
  throw new Error(
    "DATABASE_URL must be set in production. For local development, DATABASE_URL can be omitted to use SQLite.",
  );
}

export { db };
export { pool };
