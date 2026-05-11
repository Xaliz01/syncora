import "./tracer";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  const swaggerPath = process.env.SWAGGER_PATH ?? "api/docs";
  const swaggerTitle = process.env.SWAGGER_TITLE ?? "Syncora API Gateway";

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
      operationsSorter: "alpha"
    }
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.info("API Gateway is running", { port, swaggerPath: `/${swaggerPath}` });
}

bootstrap();
