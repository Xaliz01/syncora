/**
 * Doit être importé en premier dans main.ts pour instrumenter HTTP, MongoDB, etc.
 * OpenTelemetry → collector OTLP → Tempo (Grafana).
 */
import { initTelemetry } from "@planwise/telemetry";

initTelemetry("planwise-permissions-service");
