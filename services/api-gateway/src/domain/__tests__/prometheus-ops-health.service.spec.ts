import { of, throwError } from "rxjs";
import { PrometheusOpsHealthService } from "../prometheus-ops-health.service";

describe("PrometheusOpsHealthService", () => {
  const http = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PROMETHEUS_URL;
  });

  it("returns unavailable when PROMETHEUS_URL is missing", async () => {
    const service = new PrometheusOpsHealthService(http as never);
    const result = await service.getOpsHealth();
    expect(result.available).toBe(false);
    expect(result.source).toBe("unavailable");
    expect(result.services).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });

  it("aggregates probe + latency + error rates by service", async () => {
    process.env.PROMETHEUS_URL = "http://prometheus:9090";
    http.get.mockImplementation((_url: string, opts: { params: { query: string } }) => {
      const q = opts.params.query;
      if (q.includes("probe_success")) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [
                {
                  metric: { service: "api-gateway", slot: "blue" },
                  value: [1, "1"],
                },
                {
                  metric: { service: "api-gateway", slot: "green" },
                  value: [1, "0"],
                },
                { metric: { service: "cases" }, value: [1, "1"] },
                { metric: { service: "users" }, value: [1, "0"] },
              ],
            },
          },
        });
      }
      if (q.includes("latency_sum") && q.includes("sum by (service)")) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: { service: "planwise-api-gateway" }, value: [1, "42.5"] }],
            },
          },
        });
      }
      if (q.includes("histogram_quantile") && q.includes("sum by (service, le)")) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: { service: "planwise-api-gateway" }, value: [1, "88"] }],
            },
          },
        });
      }
      if (q.includes("histogram_quantile") && q.includes("sum by (le)")) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: {}, value: [1, "120"] }],
            },
          },
        });
      }
      if (q.includes("latency_sum") && !q.includes("sum by (service)")) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: {}, value: [1, "40"] }],
            },
          },
        });
      }
      if (q.includes('http_status_code=~"4.."')) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: { service: "planwise-api-gateway" }, value: [1, "0.12"] }],
            },
          },
        });
      }
      if (q.includes('http_status_code=~"5.."')) {
        return of({
          status: 200,
          data: {
            status: "success",
            data: {
              resultType: "vector",
              result: [{ metric: { service: "planwise-api-gateway" }, value: [1, "0.01"] }],
            },
          },
        });
      }
      return of({ status: 200, data: { status: "success", data: { result: [] } } });
    });

    const service = new PrometheusOpsHealthService(http as never);
    const result = await service.getOpsHealth();

    expect(result.available).toBe(true);
    expect(result.source).toBe("prometheus");
    expect(result.window).toBe("5m");

    const gateway = result.services.find((s) => s.service === "api-gateway");
    expect(gateway?.status).toBe("up");
    expect(gateway?.slots).toEqual([
      { slot: "blue", status: "up" },
      { slot: "green", status: "down" },
    ]);
    expect(gateway?.latencyMsAvg).toBe(42.5);
    expect(gateway?.latencyMsP95).toBe(88);
    expect(gateway?.errorRate4xx).toBe(0.12);
    expect(gateway?.errorRate5xx).toBe(0.01);
    expect(result.summary.latencyMsAvg).toBe(40);
    expect(result.summary.latencyMsP95).toBe(120);

    const users = result.services.find((s) => s.service === "users");
    expect(users?.status).toBe("down");

    expect(result.summary.downCount).toBeGreaterThanOrEqual(1);
    expect(result.summary.upCount).toBeGreaterThanOrEqual(2);
  });

  it("returns unavailable when Prometheus is unreachable", async () => {
    process.env.PROMETHEUS_URL = "http://prometheus:9090";
    http.get.mockReturnValue(throwError(() => new Error("ECONNREFUSED")));

    const service = new PrometheusOpsHealthService(http as never);
    const result = await service.getOpsHealth();
    expect(result.available).toBe(false);
    expect(result.message).toMatch(/Impossible de joindre Prometheus/);
  });
});
