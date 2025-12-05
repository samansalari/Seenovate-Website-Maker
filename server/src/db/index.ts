import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
  }
  return _pool;
}

export function initializeDatabase() {
  if (_db) return _db;
  
  const pool = getPool();
  _db = drizzle(pool, { schema });
  
  console.log("Database connection initialized");
  return _db;
}

export function getDb() {
  if (!_db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(target, prop) {
    const database = getDb();
    return database[prop as keyof typeof database];
  },
});

export async function closeDatabase() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    console.log("Database connection closed");
  }
}

