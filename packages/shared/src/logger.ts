import winston from "winston";
import { WinstonNestLoggerAdapter } from "./nest-logger.adapter";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Format lisible en local (development) : timestamp, service, level, message (sans métadonnées).
 * En production on garde le JSON pour Datadog.
 */
function getConsoleFormat(serviceName: string): winston.Logform.Format {
  if (isProduction) {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );
  }
  return winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format((info) => {
      delete info.dd;
      return info;
    })(),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
      const { level, message, timestamp, service, context, organizationId } = info as {
        level: string;
        message: unknown;
        timestamp?: string;
        service?: string;
        context?: string;
        organizationId?: string;
      };
      const ctx = context ? `[${context}] ` : "";
      const org = organizationId ? ` organizationId=${organizationId}` : "";
      return `${timestamp} [${service ?? serviceName}] ${level}: ${ctx}${message}${org}`;
    }),
  );
}

/**
 * Crée un logger Winston.
 * - En production : format JSON pour Datadog.
 * - En local (NODE_ENV !== 'production') : format lisible en console.
 */
export function createLogger(serviceName: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL ?? "info",
    defaultMeta: { service: serviceName },
    format: getConsoleFormat(serviceName),
    transports: [new winston.transports.Console()],
  });
}

/**
 * Crée un logger compatible NestJS (LoggerService) basé sur Winston.
 * À passer à NestFactory.create(AppModule, { logger }).
 * Expose aussi .info() pour un usage direct (ex: logger.info("Service started", { port })).
 */
export function createNestLogger(serviceName: string): WinstonNestLoggerAdapter {
  return new WinstonNestLoggerAdapter(createLogger(serviceName));
}
