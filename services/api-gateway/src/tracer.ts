/**
 * Doit être importé en premier dans main.ts pour instrumenter HTTP, MongoDB, etc.
 * OpenTelemetry → collector OTLP → Tempo (Grafana).
 */
import { initTelemetry } from "@planwise/telemetry";
import { planwiseProcess } from "./process-role";

const telemetryServiceName =
  planwiseProcess() === "worker"
    ? "planwise-worker"
    : planwiseProcess() === "notifications"
      ? "planwise-notifications"
      : "planwise-api-gateway";

initTelemetry(telemetryServiceName);
