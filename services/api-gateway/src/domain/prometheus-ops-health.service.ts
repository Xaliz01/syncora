import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  PlatformOpsHealthResponse,
  PlatformServiceHealthRow,
  PlatformServiceHealthStatus,
} from "@planwise/shared";
import { AbstractPrometheusOpsHealthService } from "./ports/platform/prometheus-ops-health.service.port";

const WINDOW = "5m";

/** Libellés BO pour les labels `service` blackbox / Tempo. */
const SERVICE_LABELS: Record<string, string> = {
  "api-gateway": "API Gateway",
  frontend: "Frontend",
  organizations: "Organizations",
  users: "Users",
  permissions: "Permissions",
  cases: "Cases",
  fleet: "Fleet",
  technicians: "Technicians",
  stock: "Stock",
  subscriptions: "Subscriptions",
  customers: "Customers",
  notifications: "Notifications",
  documents: "Documents",
  exports: "Exports",
  integrations: "Integrations",
  mongodb: "MongoDB",
};

const KNOWN_ORDER = [
  "api-gateway",
  "frontend",
  "organizations",
  "users",
  "permissions",
  "cases",
  "fleet",
  "technicians",
  "stock",
  "subscriptions",
  "customers",
  "notifications",
  "documents",
  "exports",
];

type PromSample = {
  metric: Record<string, string>;
  value: [number, string];
};

type PromVectorResult = {
  status: string;
  data?: {
    resultType: string;
    result: PromSample[];
  };
};

function prometheusBaseUrl(): string | null {
  const raw = process.env.PROMETHEUS_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function parseNumber(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function statusFromProbe(value: number | null): PlatformServiceHealthStatus {
  if (value == null) return "unknown";
  return value >= 1 ? "up" : "down";
}

function displayLabel(service: string): string {
  return SERVICE_LABELS[service] ?? service;
}

/** Aligne les noms OTEL (`planwise-cases-service`) sur les labels blackbox (`cases`). */
function normalizeServiceKey(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("planwise-")) s = s.slice("planwise-".length);
  if (s.endsWith("-service")) s = s.slice(0, -"-service".length);
  return s;
}

function sortServices(a: string, b: string): number {
  const ia = KNOWN_ORDER.indexOf(a);
  const ib = KNOWN_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

@Injectable()
export class PrometheusOpsHealthService extends AbstractPrometheusOpsHealthService {
  private readonly logger = new Logger(PrometheusOpsHealthService.name);

  constructor(private readonly http: HttpService) {
    super();
  }

  async getOpsHealth(): Promise<PlatformOpsHealthResponse> {
    const base = prometheusBaseUrl();
    const fetchedAt = new Date().toISOString();
    if (!base) {
      return {
        available: false,
        source: "unavailable",
        window: WINDOW,
        fetchedAt,
        message: "Prometheus non configuré (PROMETHEUS_URL).",
        services: [],
        summary: {
          upCount: 0,
          downCount: 0,
          unknownCount: 0,
          latencyMsAvg: null,
          latencyMsP95: null,
        },
      };
    }

    try {
      const [
        probeByServiceSlot,
        latencyByService,
        latencyP95ByService,
        latencyGlobal,
        latencyP95Global,
        rate4xx,
        rate5xx,
      ] = await Promise.all([
        this.query(base, 'probe_success{job="blackbox_http"}'),
        this.query(
          base,
          `1000 * (
            sum by (service) (rate(traces_spanmetrics_latency_sum{http_method!="OPTIONS"}[${WINDOW}]))
            /
            clamp_min(sum by (service) (rate(traces_spanmetrics_latency_count{http_method!="OPTIONS"}[${WINDOW}])), 1e-9)
          )`,
        ),
        this.query(
          base,
          `1000 * histogram_quantile(0.95, sum by (service, le) (rate(traces_spanmetrics_latency_bucket{http_method!="OPTIONS"}[${WINDOW}])))`,
        ),
        this.query(
          base,
          `1000 * (sum(rate(traces_spanmetrics_latency_sum{http_method!="OPTIONS"}[${WINDOW}])) / clamp_min(sum(rate(traces_spanmetrics_latency_count{http_method!="OPTIONS"}[${WINDOW}])), 1e-9))`,
        ),
        this.query(
          base,
          `1000 * histogram_quantile(0.95, sum by (le) (rate(traces_spanmetrics_latency_bucket{http_method!="OPTIONS"}[${WINDOW}])))`,
        ),
        this.query(
          base,
          `(
            sum by (service) (rate(traces_spanmetrics_calls_total{http_method!="OPTIONS",http_status_code=~"4.."}[${WINDOW}]))
            /
            clamp_min(sum by (service) (rate(traces_spanmetrics_calls_total{http_method!="OPTIONS"}[${WINDOW}])), 1e-9)
          )`,
        ),
        this.query(
          base,
          `(
            sum by (service) (rate(traces_spanmetrics_calls_total{http_method!="OPTIONS",http_status_code=~"5.."}[${WINDOW}]))
            /
            clamp_min(sum by (service) (rate(traces_spanmetrics_calls_total{http_method!="OPTIONS"}[${WINDOW}])), 1e-9)
          )`,
        ),
      ]);

      const latencyMap = toServiceMap(latencyByService);
      const latencyP95Map = toServiceMap(latencyP95ByService);
      const rate4xxMap = toServiceMap(rate4xx);
      const rate5xxMap = toServiceMap(rate5xx);

      const byService = new Map<
        string,
        { slots: Array<{ slot: string; value: number | null }>; bare: number | null }
      >();

      for (const row of probeByServiceSlot) {
        const service = row.metric.service?.trim();
        if (!service) continue;
        const value = parseNumber(row.value?.[1]);
        const slot = row.metric.slot?.trim();
        const entry = byService.get(service) ?? { slots: [], bare: null };
        if (slot) {
          entry.slots.push({ slot, value });
        } else {
          entry.bare = value;
        }
        byService.set(service, entry);
      }

      // Inclure les services connus même sans série (unknown).
      for (const service of KNOWN_ORDER) {
        if (!byService.has(service)) {
          byService.set(service, { slots: [], bare: null });
        }
      }

      const services: PlatformServiceHealthRow[] = [...byService.keys()]
        .sort(sortServices)
        .map((service) => {
          const entry = byService.get(service)!;
          let status: PlatformServiceHealthStatus = "unknown";
          let slots: PlatformServiceHealthRow["slots"];

          if (entry.slots.length > 0) {
            slots = entry.slots
              .slice()
              .sort((a, b) => a.slot.localeCompare(b.slot))
              .map((s) => ({
                slot: s.slot,
                status: statusFromProbe(s.value),
              }));
            if (slots.some((s) => s.status === "up")) status = "up";
            else if (slots.every((s) => s.status === "down")) status = "down";
            else status = "unknown";
          } else {
            status = statusFromProbe(entry.bare);
          }

          return {
            service,
            label: displayLabel(service),
            status,
            slots,
            latencyMsAvg: roundOrNull(latencyMap.get(service) ?? null, 1),
            latencyMsP95: roundOrNull(latencyP95Map.get(service) ?? null, 1),
            errorRate4xx: clampRate(rate4xxMap.get(service) ?? null),
            errorRate5xx: clampRate(rate5xxMap.get(service) ?? null),
          };
        });

      const summaryLatencyAvg = roundOrNull(firstVectorValue(latencyGlobal), 1);
      const summaryLatencyP95 = roundOrNull(firstVectorValue(latencyP95Global), 1);

      const summary = {
        upCount: services.filter((s) => s.status === "up").length,
        downCount: services.filter((s) => s.status === "down").length,
        unknownCount: services.filter((s) => s.status === "unknown").length,
        // Fallback si la requête globale échoue / renvoie NaN : moyenne des services.
        latencyMsAvg:
          summaryLatencyAvg ?? roundOrNull(averageOf(services.map((s) => s.latencyMsAvg)), 1),
        latencyMsP95:
          summaryLatencyP95 ?? roundOrNull(averageOf(services.map((s) => s.latencyMsP95)), 1),
      };

      return {
        available: true,
        source: "prometheus",
        window: WINDOW,
        fetchedAt,
        services,
        summary,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Prometheus";
      this.logger.warn(`Ops health Prometheus: ${message}`);
      return {
        available: false,
        source: "unavailable",
        window: WINDOW,
        fetchedAt,
        message: "Impossible de joindre Prometheus.",
        services: [],
        summary: {
          upCount: 0,
          downCount: 0,
          unknownCount: 0,
          latencyMsAvg: null,
          latencyMsP95: null,
        },
      };
    }
  }

  private async query(base: string, query: string): Promise<PromSample[]> {
    const url = `${base}/api/v1/query`;
    const response = await firstValueFrom(
      this.http.get<PromVectorResult>(url, {
        params: { query },
        timeout: 5000,
        validateStatus: (s) => s < 500,
      }),
    );
    if (response.status >= 400 || response.data?.status !== "success") {
      throw new Error(`Prometheus query failed (${response.status})`);
    }
    return response.data.data?.result ?? [];
  }
}

function toServiceMap(rows: PromSample[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = row.metric.service?.trim();
    const value = parseNumber(row.value?.[1]);
    if (!raw || value == null) continue;
    map.set(normalizeServiceKey(raw), value);
  }
  return map;
}

function firstVectorValue(rows: PromSample[]): number | null {
  return parseNumber(rows[0]?.value?.[1]);
}

function averageOf(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function roundOrNull(value: number | null, digits: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function clampRate(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, Math.round(value * 10000) / 10000));
}
