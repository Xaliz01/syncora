import { __resetTelemetryForTests, initTelemetry } from "../index";

describe("initTelemetry", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    __resetTelemetryForTests();
  });

  it("should not start when OTEL_TRACES_ENABLED is unset", () => {
    delete process.env.OTEL_TRACES_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(() => initTelemetry("planwise-test")).not.toThrow();
  });

  it("should not start when OTEL_SDK_DISABLED is true", () => {
    process.env.OTEL_TRACES_ENABLED = "true";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:4318";
    process.env.OTEL_SDK_DISABLED = "true";
    expect(() => initTelemetry("planwise-test")).not.toThrow();
  });

  it("should not start when traces endpoint is missing", () => {
    process.env.OTEL_TRACES_ENABLED = "true";
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    expect(() => initTelemetry("planwise-test")).not.toThrow();
  });
});
