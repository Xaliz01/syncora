#!/usr/bin/env node
/**
 * Vérifie que tous les conteneurs du profil monitoring local sont démarrés.
 * Appelé après `npm run monitoring:local`.
 */
import { execSync } from "node:child_process";

const REQUIRED = [
  "planwise-prometheus-local",
  "planwise-grafana-local",
  "planwise-tempo-local",
  "planwise-otel-collector-local",
  "planwise-blackbox-exporter-local",
  "planwise-node-exporter-local",
  "planwise-cadvisor-local",
];

function listRunningContainers() {
  const output = execSync('docker ps --format "{{.Names}}\t{{.Status}}"', {
    encoding: "utf8",
  });
  const map = new Map();
  for (const line of output.trim().split("\n").filter(Boolean)) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    map.set(line.slice(0, tab), line.slice(tab + 1));
  }
  return map;
}

const running = listRunningContainers();
const missing = [];
const unhealthy = [];

for (const name of REQUIRED) {
  const status = running.get(name);
  if (!status) {
    missing.push(name);
    continue;
  }
  if (!status.startsWith("Up")) {
    unhealthy.push(`${name} (${status})`);
  }
}

if (missing.length > 0 || unhealthy.length > 0) {
  console.error("[monitoring] Stack incomplète :");
  for (const name of missing) {
    console.error(`  - absent : ${name}`);
  }
  for (const entry of unhealthy) {
    console.error(`  - non healthy : ${entry}`);
  }
  console.error("\nRelancez : npm run monitoring:local");
  console.error(
    "Si Grafana affiche « An error occurred within the plugin », Prometheus est souvent arrêté.",
  );
  process.exit(1);
}

console.log("[monitoring] Stack OK");
console.log("  Grafana    → http://localhost:3030 (admin / admin)");
console.log("  Prometheus → http://localhost:9090");
console.log("  Explore    → Prometheus (métriques) ou Tempo (traces APM)");
