import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared";

async function bootstrap() {
  const logger = createNestLogger("fleet-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  logger.info("Fleet service is running", { port });
}

bootstrap();
