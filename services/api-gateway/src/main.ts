import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared";

async function bootstrap() {
  const logger = createNestLogger("api-gateway");
  const app = await NestFactory.create(AppModule, { logger });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.info("API Gateway is running", { port });
}

bootstrap();
