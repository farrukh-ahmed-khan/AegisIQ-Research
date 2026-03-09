import postgres, { type Sql } from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __aegisiq_sql__: Sql | undefined;
}

function createClient(): Sql {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  return postgres(databaseUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => undefined,
  });
}

export const sql: Sql =
  global.__aegisiq_sql__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  global.__aegisiq_sql__ = sql;
}
