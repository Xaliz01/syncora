import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { Logger } from "@nestjs/common";

const execFileAsync = promisify(execFile);

export type MigrateMongoConfigOptions = {
  /** URI Mongo par défaut si `MONGODB_URI` est absent. */
  defaultUri: string;
  /** Dossier des migrations (relatif à la racine du package). */
  migrationsDir?: string;
  /** Collection changelog migrate-mongo. */
  changelogCollectionName?: string;
};

export type MigrateMongoRuntimeConfig = {
  mongodb: { url: string; options: Record<string, never> };
  migrationsDir: string;
  changelogCollectionName: string;
  migrationFileExtension: ".js";
  moduleSystem: "commonjs";
};

/**
 * Config commune pour `migrate-mongo-config.js` des microservices.
 * Chaque service fournit son `defaultUri` (DB dédiée).
 */
export function createMigrateMongoConfig(
  options: MigrateMongoConfigOptions,
): MigrateMongoRuntimeConfig {
  const mongodbUri = process.env.MONGODB_URI?.trim() || options.defaultUri;
  return {
    mongodb: {
      url: mongodbUri,
      options: {},
    },
    migrationsDir: options.migrationsDir ?? "migrations",
    changelogCollectionName: options.changelogCollectionName ?? "changelog",
    migrationFileExtension: ".js",
    moduleSystem: "commonjs",
  };
}

/**
 * Remonte depuis `startDir` jusqu’à trouver `migrate-mongo-config.js`
 * (ts-node `src/…` ou build Nest `dist/…`).
 */
export function resolveMigrateMongoPackageRoot(startDir: string): string {
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

export type RunPendingMigrationsOptions = {
  /**
   * Point de départ pour localiser `migrate-mongo-config.js`
   * (typiquement `__dirname` de `main.ts`).
   */
  startDir: string;
};

/**
 * Applique les migrations pending via le CLI migrate-mongo.
 * Évite l’interop CJS/ESM cassée de migrate-mongo@14 sous Nest (require).
 * Échec → throw (le bootstrap doit refuser de démarrer).
 */
export async function runPendingMigrations(options: RunPendingMigrationsOptions): Promise<void> {
  const logger = new Logger("migrate-mongo");
  const packageRoot = resolveMigrateMongoPackageRoot(options.startDir);

  const { stdout, stderr } = await execFileAsync("npx", ["migrate-mongo", "up"], {
    cwd: packageRoot,
    env: process.env,
    maxBuffer: 2 * 1024 * 1024,
    shell: process.platform === "win32",
  });

  const output = [stdout, stderr].filter(Boolean).join("\n").trim();
  if (output) {
    for (const line of output.split("\n")) {
      logger.log(line);
    }
  } else {
    logger.log("Mongo migrations up to date.");
  }
}
