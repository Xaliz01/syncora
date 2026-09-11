import type winston from "winston";

/**
 * Interface compatible avec NestJS LoggerService.
 * Permet d'utiliser le logger Winston comme logger Nest sans dépendre de @nestjs/common.
 */
export interface NestLoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void;
  error(message: unknown, ...optionalParams: unknown[]): void;
  warn(message: unknown, ...optionalParams: unknown[]): void;
  debug?(message: unknown, ...optionalParams: unknown[]): void;
  verbose?(message: unknown, ...optionalParams: unknown[]): void;
  fatal?(message: unknown, ...optionalParams: unknown[]): void;
}

/**
 * Adaptateur qui fait implémenter à un logger Winston l'interface Nest (LoggerService).
 * Nest appelle log/error/warn/debug/verbose/fatal ; on les mappe vers les niveaux Winston.
 * Le dernier argument string (sans saut de ligne) est le `context` Nest → champ JSON `context`.
 */
export class WinstonNestLoggerAdapter implements NestLoggerService {
  constructor(private readonly winston: winston.Logger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("verbose", message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams);
  }

  /**
   * Méthode info pour un usage direct (ex: logger.info("Service started", { port })).
   * Nest utilise log() pour le niveau "info".
   */
  info(message: unknown, ...optionalParams: unknown[]): void {
    this.write("info", message, optionalParams);
  }

  private write(
    level: "info" | "error" | "warn" | "debug" | "verbose",
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const { text, meta } = nestToWinston(message, optionalParams);
    this.winston[level](text, meta);
  }
}

export function nestToWinston(
  message: unknown,
  optionalParams: unknown[],
): { text: string; meta: Record<string, unknown> } {
  const params = [...optionalParams];
  const meta: Record<string, unknown> = {};

  if (params.length > 0 && isNestContext(params[params.length - 1])) {
    meta.context = params.pop() as string;
  }

  for (const param of params) {
    if (typeof param === "string") {
      if (!meta.stack) meta.stack = param;
    } else if (param instanceof Error) {
      meta.stack = param.stack;
    } else if (isPlainObject(param)) {
      Object.assign(meta, param);
    }
  }

  if (isStructuredLog(message)) {
    const { message: text, ...rest } = message;
    Object.assign(meta, rest);
    return { text, meta };
  }

  return { text: formatLogMessage(message), meta };
}

function isNestContext(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("\n");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Error)
  );
}

function isStructuredLog(value: unknown): value is { message: string } & Record<string, unknown> {
  return isPlainObject(value) && typeof value.message === "string";
}

function formatLogMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (message instanceof Error) return message.message;
  return JSON.stringify(message);
}
