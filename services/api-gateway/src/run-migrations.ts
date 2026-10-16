import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { Logger } from "@nestjs/common";
import { MongoClient } from "mongodb";
import { MIGRATION_DATABASES, resolveDatabaseUri } from "./database-uri";

const execFileAsync = promisify(execFile);

function resolvePackageRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolve(dir, "migrate-mongo-config.js"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`migrate-mongo-config.js introuvable en remontant depuis ${startDir}`);
}

type MigrationLock = { _id: string; owner: string; expiresAt: Date };

async function withMigrationLock(uri: string, run: () => Promise<void>): Promise<void> {
  const client = new MongoClient(uri);
  await client.connect();
  const lock = client.db().collection<MigrationLock>("migration_lock");
  const owner = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const deadline = Date.now() + 120_000;

  try {
    while (Date.now() < deadline) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 90_000);
      try {
        const updated = await lock.findOneAndUpdate(
          {
            _id: "migrate",
            $or: [{ expiresAt: { $lte: now } }, { owner }],
          },
          { $set: { owner, expiresAt } },
          { upsert: true, returnDocument: "after" },
        );
        if (updated?.owner === owner) {
          try {
            await run();
          } finally {
            await lock.deleteOne({ _id: "migrate", owner });
          }
          return;
        }
      } catch (err) {
        const code = (err as { code?: number }).code;
        if (code !== 11000) throw err;
      }
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 400));
    }
    throw new Error("Verrou de migration Mongo indisponible");
  } finally {
    await client.close();
  }
}

/** Applique les changelogs migrate-mongo, une base à la fois. Échec → throw. */
export async function runGatewayMigrations(startDir: string): Promise<void> {
  const logger = new Logger("migrate-mongo");
  const cwd = resolvePackageRoot(startDir);

  for (const database of MIGRATION_DATABASES) {
    const uri = resolveDatabaseUri(database);
    logger.log(`Migrations ${database}`);
    await withMigrationLock(uri, async () => {
      const { stdout, stderr } = await execFileAsync(
        "npx",
        ["--no-install", "migrate-mongo", "up"],
        {
          cwd,
          env: {
            ...process.env,
            MONGODB_URI: uri,
            MIGRATE_DATABASE: database,
          },
          maxBuffer: 2 * 1024 * 1024,
        },
      );
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      if (output) {
        for (const line of output.split("\n")) {
          logger.log(line);
        }
      } else {
        logger.log(`Mongo migrations up to date (${database}).`);
      }
    });
  }
}
