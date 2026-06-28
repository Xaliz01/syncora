import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./modules/app.module";
import { createNestLogger } from "@planwise/shared/nest";

/** En local uniquement : CORS_ORIGIN peut lister plusieurs origines séparées par des virgules. */
function resolveCorsOrigin(): string | string[] {
  const raw = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const isLocal = process.env.NODE_ENV !== "production";
  if (!isLocal || !raw.includes(",")) {
    return raw.trim();
  }
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0]! : origins;
}

async function bootstrap() {
  const logger = createNestLogger("api-gateway");
  const app = await NestFactory.create(AppModule, { logger });

  app.setGlobalPrefix("api");
  const corsOrigin = resolveCorsOrigin();
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const swaggerPath = process.env.SWAGGER_PATH ?? "api/docs";
  const swaggerTitle = process.env.SWAGGER_TITLE ?? "Planwise API Gateway";

  const swaggerConfig = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription("Documentation OpenAPI des endpoints exposes par l'API Gateway")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(swaggerPath, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.info("API Gateway is running", { port, swaggerPath: `/${swaggerPath}` });
}

bootstrap();
