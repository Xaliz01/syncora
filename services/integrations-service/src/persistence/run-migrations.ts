import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Logger } from "@nestjs/common";
import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";

const execFileAsync = promisify(execFile);

/**
 * Remonte depuis ce fichier jusqu’à trouver `migrate-mongo-config.js`
 * (fonctionne en ts-node `src/…` et en build nest `dist/…/src/…`).
 */
function resolvePackageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolve(dir, "migrate-mongo-config.js"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`migrate-mongo-config.js introuvable en remontant depuis ${__dirname}`);
}

/**
 * Applique les migrations via le CLI migrate-mongo.
 * Évite l’interop CJS/ESM cassée de migrate-mongo@14 sous Nest (require).
 */
export async function runPendingMigrations(): Promise<void> {
  const logger = new Logger("migrate-mongo");
  const packageRoot = resolvePackageRoot();
  loadDotenv({ path: resolve(packageRoot, ".env") });

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
