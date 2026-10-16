import { __resetTelemetryForTests, initTelemetry } from "../index";

describe("initTelemetry", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetTelemetryForTests();
  });

  it("should not start when OTEL_TRACES_ENABLED is unset", async () => {
    delete process.env.OTEL_TRACES_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    await expect(initTelemetry("planwise-test")).resolves.toBeUndefined();
  });

  it("should not start when OTEL_SDK_DISABLED is true", async () => {
    process.env.OTEL_TRACES_ENABLED = "true";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";
    process.env.OTEL_SDK_DISABLED = "true";
    await expect(initTelemetry("planwise-test")).resolves.toBeUndefined();
  });

  it("should not start when traces endpoint is missing", async () => {
    process.env.OTEL_TRACES_ENABLED = "true";
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    await expect(initTelemetry("planwise-test")).resolves.toBeUndefined();
  });
});
