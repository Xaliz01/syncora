import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared/nest";

async function bootstrap() {
  const logger = createNestLogger("technicians-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3006;
  await app.listen(port);
  logger.info("Technicians service is running", { port });
}

bootstrap();
