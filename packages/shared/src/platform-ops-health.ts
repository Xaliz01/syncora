/** Santé infra pour le tableau de bord backoffice (Prometheus). */

export type PlatformServiceHealthStatus = "up" | "down" | "unknown";

export interface PlatformServiceHealthSlot {
  slot: string;
  status: PlatformServiceHealthStatus;
}

export interface PlatformServiceHealthRow {
  /** Identifiant Prometheus (`service` label). */
  service: string;
  /** Libellé affiché. */
  label: string;
  status: PlatformServiceHealthStatus;
  /** Slots blue/green quand présents. */
  slots?: PlatformServiceHealthSlot[];
  /** Latence moyenne (ms) sur la fenêtre, ou null si pas de données. */
  latencyMsAvg: number | null;
  /** Latence p95 (ms) sur la fenêtre, ou null si pas de données. */
  latencyMsP95: number | null;
  /** Part des requêtes en 4xx (0–1), ou null si pas de trafic. */
  errorRate4xx: number | null;
  /** Part des requêtes en 5xx (0–1), ou null si pas de trafic. */
  errorRate5xx: number | null;
  /** CPU conteneur (cœurs, cAdvisor), ou null hors Docker / sans métrique. */
  cpuCores: number | null;
  /** RAM conteneur (octets working set, cAdvisor), ou null. */
  memoryBytes: number | null;
}

export interface PlatformOpsHealthResponse {
  /** false si Prometheus injoignable / non configuré. */
  available: boolean;
  source: "prometheus" | "unavailable";
  /** Fenêtre des rates (ex. `5m`). */
  window: string;
  fetchedAt: string;
  message?: string;
  services: PlatformServiceHealthRow[];
  summary: {
    upCount: number;
    downCount: number;
    unknownCount: number;
    /** Latence moyenne globale (ms), tous services. */
    latencyMsAvg: number | null;
    /** Latence p95 globale (ms), tous services. */
    latencyMsP95: number | null;
    /** Utilisation CPU hôte (0–100), node-exporter. */
    cpuUsagePercent: number | null;
    /** Utilisation RAM hôte (0–100), node-exporter. */
    memoryUsagePercent: number | null;
    /** RAM utilisée (octets), si disponible. */
    memoryUsedBytes: number | null;
    /** RAM totale (octets), si disponible. */
    memoryTotalBytes: number | null;
  };
}
