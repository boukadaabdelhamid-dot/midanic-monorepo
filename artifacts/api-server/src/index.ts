import { createServer } from "http";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import app from "./app";
import { setupWebSocket } from "./lib/ws";
import { logger } from "./lib/logger";
import { db, schema, pool } from "./lib/db";
import { seed } from "./seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, "../../../lib/db/drizzle");

async function runMigrations() {
  const sqlFile = path.join(migrationsFolder, "0000_left_moon_knight.sql");
  if (!fs.existsSync(sqlFile)) {
    logger.warn({ sqlFile }, "Migration file not found, skipping.");
    return;
  }
  const sql = fs.readFileSync(sqlFile, "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  let applied = 0;
  let skipped = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      applied++;
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate column") ||
        msg.includes("already been created")
      ) {
        skipped++;
      } else {
        logger.warn({ err: msg, stmt: stmt.slice(0, 120) }, "Migration statement warning (non-fatal)");
      }
    }
  }
  logger.info({ applied, skipped }, "DB migrations done.");
}

async function runSeedIfNeeded() {
  try {
    const users = await db.select({ id: schema.usersTable.id }).from(schema.usersTable).limit(1);
    if (users.length === 0) {
      logger.info("No users found — running seed...");
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
  await runMigrations();
  await runSeedIfNeeded();
});

server.on("error", (err) => {
  logger.error({ err }, "Server error");
  process.exit(1);
});
