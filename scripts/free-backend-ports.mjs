#!/usr/bin/env node
/**
 * Libère les ports utilisés par la gateway et les microservices (évite EADDRINUSE
 * quand un ancien ts-node-dev tourne encore).
 */
import { execSync } from "node:child_process";

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011];

function listListeners(port) {
  try {
    const out = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null`, {
      encoding: "utf8",
    }).trim();
    if (!out) return [];
    return [...new Set(out.split("\n").filter(Boolean))];
  } catch {
    return [];
  }
}

let freed = 0;
for (const port of PORTS) {
  for (const pid of listListeners(port)) {
    const n = Number(pid);
    if (!Number.isFinite(n)) continue;
    console.log(`[backend] Libération du port ${port} (PID ${n})`);
    try {
      process.kill(n, "SIGTERM");
      freed += 1;
    } catch {
      /* déjà terminé */
    }
  }
}

if (freed > 0) {
  execSync("sleep 0.5");
}

console.log(
  freed > 0
    ? `[backend] ${freed} processus libéré(s) sur les ports backend.`
    : "[backend] Aucun port backend occupé.",
);
