let started = false;

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function resolveOtlpTracesUrl(): string | null {
  const explicit = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();
  if (explicit) {
    return explicit;
  }

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!base) {
    return null;
  }

  const normalized = base.replace(/\/$/, "");
  return normalized.endsWith("/v1/traces") ? normalized : `${normalized}/v1/traces`;
}

/**
 * Initialise OpenTelemetry (traces OTLP → collector → Tempo/Grafana).
 * No-op unless `OTEL_TRACES_ENABLED=true` (ou `OTEL_SDK_DISABLED=true` pour forcer l'arrêt).
 * Doit être appelé avant tout autre import applicatif (voir `main.ts`).
 */
export async function initTelemetry(defaultServiceName: string): Promise<void> {
  if (started || isTruthy(process.env.OTEL_SDK_DISABLED)) {
    return;
  }

  if (!isTruthy(process.env.OTEL_TRACES_ENABLED)) {
    return;
  }

  const tracesUrl = resolveOtlpTracesUrl();
  if (!tracesUrl) {
    return;
  }

  const serviceName = process.env.OTEL_SERVICE_NAME?.trim() || defaultServiceName;
  const serviceVersion =
    process.env.OTEL_SERVICE_VERSION?.trim() ||
    process.env.APP_VERSION?.trim() ||
    process.env.GIT_SHA?.trim() ||
    undefined;
  const deploymentEnvironment =
    process.env.OTEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "development";

  // Import tardif : le graphe OpenTelemetry bloque ts-node-dev plusieurs minutes
  // s'il est chargé alors que les traces sont désactivées.
  const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
  const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
  const { Resource } = await import("@opentelemetry/resources");
  const { NodeSDK } = await import("@opentelemetry/sdk-node");
  const { ATTR_DEPLOYMENT_ENVIRONMENT_NAME, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } =
    await import("@opentelemetry/semantic-conventions");

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      ...(serviceVersion ? { [ATTR_SERVICE_VERSION]: serviceVersion } : {}),
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: deploymentEnvironment,
    }),
    traceExporter: new OTLPTraceExporter({ url: tracesUrl }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
      }),
    ],
  });

  sdk.start();
  started = true;
  // Visible au boot local pour confirmer que Tempo/collector recevront bien des spans.
  console.info(`[otel] traces enabled → ${tracesUrl} (service=${serviceName})`);

  const shutdown = () => {
    void sdk.shutdown();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

/** Test helper — réinitialise l'état module entre les tests unitaires. */
export function __resetTelemetryForTests(): void {
  started = false;
}
