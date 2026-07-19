import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../.env") });

import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@planwise/shared/nest";

async function bootstrap() {
  const logger = createNestLogger("integrations-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3013;
  await app.listen(port);
  logger.info("Integrations service is running", { port });
}

bootstrap();
