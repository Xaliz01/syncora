#!/usr/bin/env node
/**
 * Démarre l’API gateway (PLANWISE_PROCESS=all : HTTP + crons) après MongoDB.
 * Worker et notifications sont des processus séparés en production.
 *
 * Ctrl+C / SIGTERM : tue l’arbre npm, puis libère les ports.
 */
import { spawn, execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];
let shuttingDown = false;

function log(message) {
  console.log(`[backend] ${message}`);
}

function killProcessTree(pid, signal = "SIGTERM") {
  if (!pid) return;
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      /* déjà terminé */
    }
  }
}

function freeBackendPorts() {
  try {
    execFileSync(process.execPath, [join(__dirname, "free-backend-ports.mjs")], {
      stdio: "inherit",
    });
  } catch {
    /* ignore */
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("Arrêt de l’API…");

  for (const child of children) {
    if (child.pid) killProcessTree(child.pid, "SIGTERM");
  }

  setTimeout(() => {
    for (const child of children) {
      if (child.pid) killProcessTree(child.pid, "SIGKILL");
    }
    freeBackendPorts();
    process.exit(exitCode);
  }, 1500);
}

function withLocalOtelEnv(baseEnv = process.env) {
  const env = {
    ...baseEnv,
    TS_NODE_TRANSPILE_ONLY: "true",
  };
  // Les traces ne sont pas activées par défaut : le chargement d'OpenTelemetry
  // sous ts-node-dev reste silencieux plusieurs minutes. Pour les activer :
  // OTEL_TRACES_ENABLED=true npm run backend (collector sur :4318).
  if (baseEnv.OTEL_TRACES_ENABLED === "true" && !baseEnv.OTEL_EXPORTER_OTLP_ENDPOINT) {
    env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";
  }
  return env;
}

function main() {
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  log("Démarrage de l’API (port 3000, crons inclus)…");
  const gateway = spawn("npm", ["run", "backend:api"], {
    stdio: "inherit",
    shell: true,
    detached: true,
    env: withLocalOtelEnv(),
  });
  children.push(gateway);
  gateway.on("exit", (code) => {
    if (shuttingDown) return;
    shutdown(code ?? 1);
  });
}

main();
