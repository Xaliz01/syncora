import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared/nest";

async function bootstrap() {
  const logger = createNestLogger("permissions-service");
  const app = await NestFactory.create(AppModule, { logger });
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  logger.info("Permissions service is running", { port });
}

bootstrap();
