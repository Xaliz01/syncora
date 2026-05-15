import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@syncora/shared";

async function bootstrap() {
  const logger = createNestLogger("subscriptions-service");
  const port = process.env.PORT ?? 3008;
  logger.info("Démarrage subscriptions-service (Nest + MongoDB)…", { port });
  const app = await NestFactory.create(AppModule, {
    logger,
    rawBody: true,
  });
  await app.listen(port);
  logger.info(
    "Subscriptions microservice prêt (Stripe Checkout, portail client, webhooks sur POST /webhooks/stripe)",
    { port },
  );
}

bootstrap();
