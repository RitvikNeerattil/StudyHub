import { Pool } from "pg";

declare global {
  var __studyHubPool: Pool | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function productionRuntime() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  );
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (productionRuntime() && !process.env.DATABASE_URL.startsWith("postgres")) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  }

  if (!global.__studyHubPool) {
    global.__studyHubPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  return global.__studyHubPool;
}
