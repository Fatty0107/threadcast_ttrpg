import app from "./app";
import { logger } from "./lib/logger";
import { seedUsers } from "./routes/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await seedUsers();
    logger.info("Demo users seeded");
  } catch (e) {
    logger.error({ err: e }, "Failed to seed users — DB may not be ready yet");
  }
});
