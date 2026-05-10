import { createServer } from "http";
import app from "./app";
import { setupWebSocket } from "./lib/ws";
import { logger } from "./lib/logger";
import { db, schema } from "./lib/db";
import { seed } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runSeedIfNeeded() {
  if (!process.env.AUTO_SEED || process.env.AUTO_SEED !== "true") {
    logger.info("AUTO_SEED not enabled — skipping auto-seed. Set AUTO_SEED=true to seed on first boot.");
    return;
  }
  try {
    const users = await db.select({ id: schema.usersTable.id }).from(schema.usersTable).limit(1);
    if (users.length === 0) {
      logger.info("AUTO_SEED=true and no users found — running seed...");
      await seed();
    } else {
      logger.info("Database already has data, skipping seed.");
    }
  } catch (err) {
    logger.warn({ err }, "Auto-seed skipped (non-fatal)");
  }
}

const server = createServer(app);
setupWebSocket(server);

server.listen(port, async () => {
  logger.info({ port }, "Server listening");
  await runSeedIfNeeded();
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
