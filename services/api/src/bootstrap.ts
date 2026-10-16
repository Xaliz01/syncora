import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { createNestLogger } from "@planwise/shared/nest";
import { AppModule } from "./modules/app.module";
import { defaultListenPort, processServiceName, runsHttp, runsMigrations } from "./process-role";
import { runDatabaseMigrations } from "./run-migrations";

/** CORS : liste d’origines séparées par des virgules (app + backoffice en prod). */
function resolveCorsOrigin(): string | string[] {
  const raw = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length <= 1 ? (origins[0] ?? raw.trim()) : origins;
}

export async function startProcess(): Promise<void> {
  const serviceName = processServiceName();
  const logger = createNestLogger(serviceName);

  if (runsMigrations()) {
    try {
      await runDatabaseMigrations(__dirname);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      logger.error(`Mongo migrations failed — refusing to start: ${message}`, {
        error: message,
        stack,
      });
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, { logger, rawBody: true });
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.setGlobalPrefix("api", {
    exclude: [{ path: "webhooks/stripe", method: RequestMethod.POST }],
  });

  if (runsHttp()) {
    const corsOrigin = resolveCorsOrigin();
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });

    const swaggerPath = process.env.SWAGGER_PATH ?? "api/docs";
    const swaggerTitle = process.env.SWAGGER_TITLE ?? "Planwise API";
    const swaggerConfig = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription("Documentation OpenAPI de l’API Planwise")
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
    logger.info("Swagger ready", { swaggerPath: `/${swaggerPath}` });
  }

  const port = process.env.PORT || defaultListenPort();
  await app.listen(port);
  logger.info("Process is running", {
    service: serviceName,
    port,
    role: process.env.PLANWISE_PROCESS ?? "all",
  });
}
