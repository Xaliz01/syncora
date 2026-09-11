import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Observable, catchError, tap, throwError } from "rxjs";

type AccessRequest = {
  method?: string;
  url?: string;
  originalUrl?: string;
  path?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  user?: { sub?: string; organizationId?: string };
};

type AccessResponse = {
  statusCode?: number;
};

/** Chemins exclus (probes, bruit). */
export function shouldSkipHttpAccessLogPath(path: string): boolean {
  const normalized = path.split("?")[0] || "/";
  return (
    normalized === "/health" ||
    normalized.endsWith("/health") ||
    normalized === "/metrics" ||
    normalized.endsWith("/metrics")
  );
}

export function sanitizeHttpAccessLogPath(raw: string): string {
  const pathOnly = (raw.split("?")[0] || "/").trim() || "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

export function resolveHttpAccessOrganizationId(req: AccessRequest): string | undefined {
  if (typeof req.user?.organizationId === "string" && req.user.organizationId.trim()) {
    return req.user.organizationId.trim();
  }
  const header = req.headers?.["x-organization-id"] ?? req.headers?.["organization-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (Array.isArray(header) && typeof header[0] === "string" && header[0].trim()) {
    return header[0].trim();
  }
  const fromQuery = req.query?.organizationId;
  if (typeof fromQuery === "string" && fromQuery.trim()) return fromQuery.trim();
  const fromBody = req.body?.organizationId;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();
  return undefined;
}

/**
 * Access log HTTP pour Grafana/Loki : une ligne par requête (hors /health et /metrics).
 * Format Huby-like : `GET /cases 200 12ms` + champs JSON `context=HTTP`, `organizationId`.
 */
@Injectable()
export class HttpAccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<AccessRequest>();
    const res = http.getResponse<AccessResponse>();

    const method = (req.method ?? "GET").toUpperCase();
    const path = sanitizeHttpAccessLogPath(req.originalUrl ?? req.url ?? req.path ?? "/");
    if (shouldSkipHttpAccessLogPath(path)) {
      return next.handle();
    }

    const started = Date.now();
    const organizationId = resolveHttpAccessOrganizationId(req);
    const userId = typeof req.user?.sub === "string" ? req.user.sub : undefined;

    const writeLog = (statusCode: number) => {
      const durationMs = Date.now() - started;
      const payload: { message: string; organizationId?: string; userId?: string } = {
        message: `${method} ${path} ${statusCode} ${durationMs}ms`,
      };
      if (organizationId) payload.organizationId = organizationId;
      if (userId) payload.userId = userId;

      if (statusCode >= 500) {
        this.logger.error(payload);
      } else if (statusCode >= 400) {
        this.logger.warn(payload);
      } else {
        this.logger.log(payload);
      }
    };

    return next.handle().pipe(
      tap(() => {
        writeLog(typeof res.statusCode === "number" ? res.statusCode : 200);
      }),
      catchError((err: unknown) => {
        let status = 500;
        if (err instanceof HttpException) {
          status = err.getStatus();
        } else if (
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof (err as { status: unknown }).status === "number"
        ) {
          status = (err as { status: number }).status;
        }
        writeLog(status);
        return throwError(() => err);
      }),
    );
  }
}

/** Provider Nest `APP_INTERCEPTOR` à enregistrer dans AppModule. */
export function provideHttpAccessLogInterceptor() {
  return { provide: APP_INTERCEPTOR, useClass: HttpAccessLogInterceptor };
}
