import { config } from "dotenv";
import { resolve } from "node:path";

/** Avant `tracer` et les décorateurs de modules : OTEL_* et PLANWISE_PROCESS. */
config({ path: resolve(__dirname, "../.env") });

async function bootstrap() {
  await import("./tracer");
  const { startProcess } = await import("./bootstrap");
  await startProcess();
}

void bootstrap();
