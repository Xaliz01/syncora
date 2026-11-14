import type { NestExpressApplication } from "@nestjs/platform-express";
import { HTTP_JSON_BODY_LIMIT } from "@planwise/shared";

/**
 * Remplace le parser JSON Express (100 Ko par défaut). Sans ça, le POST
 * copilote (audio en base64) est rejeté avant le contrôleur.
 * À appeler avec `bodyParser: false` sur `NestFactory.create`.
 */
export function configureHttpBodyParser(app: NestExpressApplication): void {
  app.useBodyParser("json", { limit: HTTP_JSON_BODY_LIMIT });
  app.useBodyParser("urlencoded", { extended: true, limit: HTTP_JSON_BODY_LIMIT });
}
