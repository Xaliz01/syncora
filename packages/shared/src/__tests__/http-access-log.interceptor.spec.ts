import {
  HttpAccessLogInterceptor,
  resolveHttpAccessOrganizationId,
  sanitizeHttpAccessLogPath,
  shouldSkipHttpAccessLogPath,
  provideHttpAccessLogInterceptor,
} from "../http-access-log.interceptor";
import { of, throwError } from "rxjs";
import { HttpException } from "@nestjs/common";

describe("http-access-log helpers", () => {
  it("sanitizeHttpAccessLogPath retire la query string", () => {
    expect(sanitizeHttpAccessLogPath("/cases?limit=10")).toBe("/cases");
    expect(sanitizeHttpAccessLogPath("cases")).toBe("/cases");
  });

  it("shouldSkipHttpAccessLogPath ignore /health", () => {
    expect(shouldSkipHttpAccessLogPath("/health")).toBe(true);
    expect(shouldSkipHttpAccessLogPath("/health?ready=1")).toBe(true);
    expect(shouldSkipHttpAccessLogPath("/cases")).toBe(false);
  });

  it("resolveHttpAccessOrganizationId lit user, header, query puis body", () => {
    expect(resolveHttpAccessOrganizationId({ user: { organizationId: "org-user" } })).toBe(
      "org-user",
    );
    expect(
      resolveHttpAccessOrganizationId({
        headers: { "x-organization-id": "org-header" },
      }),
    ).toBe("org-header");
    expect(resolveHttpAccessOrganizationId({ query: { organizationId: "org-query" } })).toBe(
      "org-query",
    );
    expect(resolveHttpAccessOrganizationId({ body: { organizationId: "org-body" } })).toBe(
      "org-body",
    );
  });

  it("provideHttpAccessLogInterceptor enregistre APP_INTERCEPTOR", () => {
    const provider = provideHttpAccessLogInterceptor();
    expect(provider.useClass).toBe(HttpAccessLogInterceptor);
    expect(provider.provide).toBeDefined();
  });
});

describe("HttpAccessLogInterceptor", () => {
  function mockContext(req: Record<string, unknown>, res: { statusCode?: number }) {
    return {
      getType: () => "http" as const,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    };
  }

  it("log une requête réussie et ignore /health", () => {
    const interceptor = new HttpAccessLogInterceptor();
    const logSpy = jest.spyOn(
      (interceptor as unknown as { logger: { log: jest.Mock } }).logger,
      "log",
    );

    const health$ = interceptor.intercept(
      mockContext({ method: "GET", url: "/health" }, { statusCode: 200 }) as never,
      { handle: () => of({ ok: true }) },
    );
    health$.subscribe();
    expect(logSpy).not.toHaveBeenCalled();

    const cases$ = interceptor.intercept(
      mockContext(
        {
          method: "GET",
          url: "/cases?limit=5",
          headers: { "x-organization-id": "org-1" },
          user: { sub: "user-1" },
        },
        { statusCode: 200 },
      ) as never,
      { handle: () => of([]) },
    );
    cases$.subscribe();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^http_access method=GET path=\/cases status=200 durationMs=\d+ organizationId=org-1 userId=user-1$/,
      ),
    );
  });

  it("log en warn pour HttpException 4xx", () => {
    const interceptor = new HttpAccessLogInterceptor();
    const warnSpy = jest.spyOn(
      (interceptor as unknown as { logger: { warn: jest.Mock } }).logger,
      "warn",
    );

    const stream$ = interceptor.intercept(
      mockContext({ method: "POST", url: "/cases" }, {}) as never,
      { handle: () => throwError(() => new HttpException("Bad", 400)) },
    );

    stream$.subscribe({
      error: () => undefined,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^http_access method=POST path=\/cases status=400 durationMs=\d+$/),
    );
  });
});
