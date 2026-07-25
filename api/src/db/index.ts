import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

// `prepare: false` keeps the client compatible with transaction-mode poolers
// (Neon/Supabase pooled connection strings); harmless against local Postgres.
export const sql = postgres(env.DATABASE_URL, { max: 10, onnotice: () => {}, prepare: false });

export const db = drizzle(sql, { schema });

export type Db = typeof db;
export * as tables from "./schema";
