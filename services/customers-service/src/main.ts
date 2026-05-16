import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared/nest";

async function bootstrap() {
  const logger = createNestLogger("customers-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3009;
  await app.listen(port);
  logger.info("Customers service is running", { port });
}

bootstrap();
