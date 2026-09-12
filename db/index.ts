import { drizzle } from "drizzle-orm/neon-http";
import process from "node:process";
import * as schema from "./schema";

let cachedUrl = "";
let cachedDb: ReturnType<typeof drizzle> | null = null;

function readRuntimeEnvironment(name: string) {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  const netlifyValue = (globalThis as typeof globalThis & {
    Netlify?: { env?: { get?: (key: string) => string | undefined } };
  }).Netlify?.env?.get?.(name)?.trim();

  return netlifyValue || undefined;
}

export function getDb() {
  const connectionString = readRuntimeEnvironment("DATABASE_URL") ?? readRuntimeEnvironment("NETLIFY_DB_URL");
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the external Postgres connection string to the local and Netlify function environments before using the API."
    );
  }

  if (!cachedDb || cachedUrl !== connectionString) {
    cachedDb = drizzle(connectionString, { schema });
    cachedUrl = connectionString;
  }

  return cachedDb;
}
