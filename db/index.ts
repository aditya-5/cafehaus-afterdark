import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import process from "node:process";
import * as schema from "./schema";

let cachedUrl = "";
let cachedDb: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  const netlifyEnv = (globalThis as typeof globalThis & {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
  }).Netlify?.env;
  const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL ?? netlifyEnv?.get?.("DATABASE_URL") ?? "";
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the external Postgres connection string to the local and Netlify function environments before using the API."
    );
  }

  if (!cachedDb || cachedUrl !== connectionString) {
    cachedDb = drizzle(neon(connectionString), { schema });
    cachedUrl = connectionString;
  }

  return cachedDb;
}
