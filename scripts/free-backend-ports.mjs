#!/usr/bin/env node
/**
 * Libère les ports utilisés par la gateway et les microservices (évite EADDRINUSE
 * quand un ancien ts-node-dev tourne encore).
 *
 * Stratégie : SIGTERM d'abord (arrêt propre), puis SIGKILL pour les survivants
 * (certains process ts-node-dev ignorent SIGTERM et gardent le port occupé).
 */
import { execSync } from "node:child_process";

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012];

function listListeners(port) {
  try {
    const out = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
    if (!out) return [];
    return [...new Set(out.split("\n").filter(Boolean))]
      .map((pid) => Number(pid))
      .filter((pid) => Number.isFinite(pid));
  } catch {
    return [];
  }
}

function sleep(ms) {
  try {
    execSync(`sleep ${ms / 1000}`);
  } catch {
    /* ignore */
  }
}

function killPids(pids, signal) {
  let count = 0;
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
      count += 1;
    } catch {
      /* déjà terminé */
    }
  }
  return count;
}

// 1. SIGTERM (arrêt propre) sur tout ce qui écoute.
let termed = 0;
for (const port of PORTS) {
  const pids = listListeners(port);
  if (pids.length > 0) {
    console.log(`[backend] Libération du port ${port} (PID ${pids.join(", ")})`);
    termed += killPids(pids, "SIGTERM");
  }
}

if (termed > 0) {
  sleep(800);
}

// 2. SIGKILL sur les survivants (process qui ignorent SIGTERM).
let killed = 0;
for (const port of PORTS) {
  const survivors = listListeners(port);
  if (survivors.length > 0) {
    console.log(
      `[backend] Port ${port} toujours occupé après SIGTERM → SIGKILL (PID ${survivors.join(", ")})`,
    );
    killed += killPids(survivors, "SIGKILL");
  }
}

if (killed > 0) {
  sleep(300);
}

const total = termed + killed;
console.log(
  total > 0
    ? `[backend] ${total} signal(aux) envoyé(s) pour libérer les ports backend (${killed} via SIGKILL).`
    : "[backend] Aucun port backend occupé.",
);
