import { config } from "dotenv";
import { resolve } from "node:path";

/** En local uniquement : en prod les variables viennent de Docker / l'environnement. */
if (process.env.NODE_ENV !== "production") {
  config({ path: resolve(__dirname, "../.env") });
}

import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@planwise/shared/nest";

async function bootstrap() {
  const logger = createNestLogger("notifications-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  logger.info("Notifications service is running", { port });
}

bootstrap();
