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
 */
export class WinstonNestLoggerAdapter implements NestLoggerService {
  constructor(private readonly winston: winston.Logger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.info(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.error(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.warn(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.debug(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.verbose(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.error(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  /**
   * Méthode info pour un usage direct (ex: logger.info("Service started", { port })).
   * Nest utilise log() pour le niveau "info".
   */
  info(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.info(this.formatMessage(message), ...this.formatRest(optionalParams));
  }

  private formatMessage(message: unknown): string {
    if (typeof message === "string") return message;
    if (message instanceof Error) return message.message;
    return JSON.stringify(message);
  }

  private formatRest(optionalParams: unknown[]): unknown[] {
    return optionalParams;
  }
}
