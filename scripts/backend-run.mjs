#!/usr/bin/env node
/**
 * Phase 1 : démarre les 11 microservices (backend:microservices).
 * Phase 2 : attend que tous les ports TCP soient ouverts (échec si timeout).
 * Phase 3 : démarre l’API gateway.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const waitOn = require("wait-on");

const SERVICE_PORTS = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011];
const WAIT_TIMEOUT_MS = 180_000;

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function log(message) {
  console.log(`[backend] ${message}`);
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (child.pid && !child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(exitCode);
}

async function waitForAllMicroservices() {
  log(
    `Attente des 11 microservices (ports ${SERVICE_PORTS.join(", ")}, max ${WAIT_TIMEOUT_MS / 1000}s)…`,
  );
  await waitOn({
    resources: SERVICE_PORTS.map((port) => `tcp:127.0.0.1:${port}`),
    timeout: WAIT_TIMEOUT_MS,
    interval: 500,
    window: 1000,
  });
  log("Tous les microservices sont prêts.");
}

function spawnNpmScript(scriptName) {
  const child = spawn("npm", ["run", scriptName], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: "true",
    },
  });
  children.push(child);
  return child;
}

async function main() {
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  log("Démarrage des microservices…");
  const microservices = spawnNpmScript("backend:microservices");

  microservices.on("exit", (code) => {
    if (code !== null && code !== 0) {
      log(`Microservices arrêtés (code ${code}).`);
      shutdown(code);
    }
  });

  try {
    await waitForAllMicroservices();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log(`Échec : tous les microservices ne sont pas prêts — ${detail}`);
    shutdown(1);
    return;
  }

  log("Démarrage de l’API gateway…");
  const gateway = spawnNpmScript("backend:gateway");

  gateway.on("exit", (code) => {
    shutdown(code ?? 1);
  });
}

main().catch((err) => {
  console.error("[backend] Erreur fatale :", err);
  shutdown(1);
});
