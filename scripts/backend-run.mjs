#!/usr/bin/env node
/**
 * Phase 1 : démarre les 11 microservices (backend:microservices).
 * Phase 2 : attend que tous les ports TCP soient ouverts (logs de progression).
 * Phase 3 : démarre l’API gateway.
 */
import { spawn } from "node:child_process";
import net from "node:net";

const SERVICE_PORTS = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011];
const PORT_LABELS = {
  3001: "organizations",
  3002: "users",
  3003: "permissions",
  3004: "cases",
  3005: "fleet",
  3006: "technicians",
  3007: "stock",
  3008: "subscriptions",
  3009: "customers",
  3010: "notifications",
  3011: "documents",
};
const WAIT_TIMEOUT_MS = 180_000;
const PROGRESS_INTERVAL_MS = 3_000;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function getMissingPorts() {
  const checks = await Promise.all(
    SERVICE_PORTS.map(async (port) => ({
      port,
      open: await isPortOpen(port),
    })),
  );
  return checks.filter((c) => !c.open).map((c) => c.port);
}

function formatMissingPorts(ports) {
  return ports
    .map((port) => `${port} (${PORT_LABELS[port] ?? "?"})`)
    .join(", ");
}

async function waitForAllMicroservices() {
  log(
    `Attente des 11 microservices (ports ${SERVICE_PORTS.join(", ")}, max ${WAIT_TIMEOUT_MS / 1000}s)…`,
  );

  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let lastProgressAt = 0;

  while (Date.now() < deadline) {
    const missing = await getMissingPorts();
    if (missing.length === 0) {
      log("Tous les microservices sont prêts.");
      return;
    }

    const now = Date.now();
    if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
      log(`En attente : ${formatMissingPorts(missing)}`);
      lastProgressAt = now;
    }

    await sleep(500);
  }

  const stillMissing = await getMissingPorts();
  throw new Error(
    stillMissing.length > 0
      ? `timeout — ports encore fermés : ${formatMissingPorts(stillMissing)}`
      : "timeout",
  );
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
    log(`Échec : ${detail}`);
    log(
      "Astuce : relancez après « npm run backend:down » ou vérifiez les logs du service manquant (souvent subscriptions ou users).",
    );
    shutdown(1);
    return;
  }

  log("Démarrage de l’API gateway (port 3000)…");
  const gateway = spawnNpmScript("backend:gateway");

  gateway.on("exit", (code) => {
    shutdown(code ?? 1);
  });
}

main().catch((err) => {
  console.error("[backend] Erreur fatale :", err);
  shutdown(1);
});
