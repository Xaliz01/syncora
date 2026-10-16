import { config } from "dotenv";
import { resolve } from "node:path";

/** Avant `tracer` et les décorateurs de modules : OTEL_* et PLANWISE_PROCESS. */
config({ path: resolve(__dirname, "../.env") });

console.info("[api] chargement des modules…");

async function bootstrap() {
  const { startTelemetry } = await import("./tracer");
  await startTelemetry();
  const { startProcess } = await import("./bootstrap");
  await startProcess();
}

void bootstrap();
