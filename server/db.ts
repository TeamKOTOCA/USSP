import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import pg from "pg";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";

const { Pool } = pg;

let db: any;
let pool: InstanceType<typeof Pool> | undefined;
let mysqlPool: any | undefined;

function initializeSqliteSchema(sqliteDb: any) {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS storage_adapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS namespaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      storage_adapter_id INTEGER,
      quota_bytes INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (storage_adapter_id) REFERENCES storage_adapters(id)
    );

    CREATE TABLE IF NOT EXISTS oauth_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_id TEXT NOT NULL UNIQUE,
      client_secret TEXT NOT NULL,
      redirect_uris TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namespace_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      etag TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (namespace_id) REFERENCES namespaces(id)
    );

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      code TEXT UNIQUE,
      access_token TEXT UNIQUE,
      refresh_token TEXT UNIQUE,
      code_challenge TEXT,
      code_challenge_method TEXT,
      redirect_uri TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backup_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER NOT NULL,
      source_adapter_id INTEGER NOT NULL,
      target_adapter_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (file_id) REFERENCES files(id),
      FOREIGN KEY (source_adapter_id) REFERENCES storage_adapters(id),
      FOREIGN KEY (target_adapter_id) REFERENCES storage_adapters(id)
    );
  `);
}

function resolveDbClient(): "sqlite" | "postgres" | "mysql" {
  const explicit = process.env.DB_CLIENT?.toLowerCase();
  if (explicit === "sqlite" || explicit === "postgres" || explicit === "mysql") {
    return explicit;
  }

  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) return "postgres";
  if (url.startsWith("mysql://")) return "mysql";
  return "sqlite";
}

const dbClient = resolveDbClient();

if (dbClient === "sqlite") {
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const sqlitePath = process.env.SQLITE_PATH || path.join(dbDir, "ussp.db");
  const sqliteDb = new Database(sqlitePath);
  sqliteDb.pragma("journal_mode = WAL");
  initializeSqliteSchema(sqliteDb);

  db = drizzleSqlite(sqliteDb, { schema });
  console.log(`[DB] Using SQLite (internal): ${sqlitePath}`);
} else if (dbClient === "postgres") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_CLIENT=postgres");
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool, { schema });
  console.log("[DB] Using PostgreSQL (external server)");
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when DB_CLIENT=mysql");
  }

  const mysqlLib = eval("require")("mysql2/promise");
  const drizzleMySql = eval("require")("drizzle-orm/mysql2").drizzle;
  mysqlPool = mysqlLib.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  });
  db = drizzleMySql(mysqlPool, { schema: schema as any, mode: "default" });
  console.log("[DB] Using MySQL (external server)");
}

export { db, pool, mysqlPool };
