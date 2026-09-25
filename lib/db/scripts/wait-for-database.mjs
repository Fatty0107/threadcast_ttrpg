import pg from "pg";
import { setTimeout as sleep } from "node:timers/promises";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set on the web service.");
  process.exit(1);
}

function describeFailure(error) {
  const code = error?.code;
  if (code === "28P01") return "PostgreSQL rejected the username or password (28P01).";
  if (code === "3D000") return "The configured PostgreSQL database does not exist (3D000).";
  if (code === "42501") return "The database user does not have sufficient privileges (42501).";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return `The database hostname could not be resolved (${code}).`;
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "EHOSTUNREACH") {
    return `The database could not be reached (${code}).`;
  }
  if (/certificate|ssl|tls/i.test(error?.message ?? "")) {
    return "The database rejected the TLS/SSL connection. Check the URL's SSL settings.";
  }
  // Avoid logging the raw error: some drivers include connection details in messages.
  return `PostgreSQL connection failed (${code ?? "no error code"}).`;
}

for (let attempt = 1; attempt <= 4; attempt++) {
  let client;
  try {
    client = new pg.Client({
      connectionString: url,
      connectionTimeoutMillis: 8_000,
      query_timeout: 8_000,
    });
    await client.connect();
    await client.query("SELECT 1");
    console.log("PostgreSQL is reachable; continuing with schema sync.");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error(`Database check ${attempt}/4: ${describeFailure(error)}`);
    await client?.end().catch(() => {});
    if (attempt === 4) {
      console.error("Database still unavailable. Confirm DATABASE_URL points to a running PostgreSQL instance reachable from this Render service.");
      process.exit(1);
    }
    await sleep(attempt * 2_000);
  }
}