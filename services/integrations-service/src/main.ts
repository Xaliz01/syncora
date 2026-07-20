import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env") });

import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@planwise/shared/nest";
import { runPendingMigrations } from "./persistence/run-migrations";

async function bootstrap() {
  const logger = createNestLogger("integrations-service");

  try {
    await runPendingMigrations();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error(`Mongo migrations failed — refusing to start: ${message}`, {
      error: message,
      stack,
    });
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3013;
  await app.listen(port);
  logger.info("Integrations service is running", { port });
}

bootstrap();
