import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared";

async function bootstrap() {
  const logger = createNestLogger("users-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  logger.info("Users service is running", { port });
}

bootstrap();
