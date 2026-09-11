import { WinstonNestLoggerAdapter, nestToWinston } from "../nest-logger.adapter";

describe("nestToWinston", () => {
  it("extrait le context Nest et un message structuré", () => {
    expect(
      nestToWinston({ message: "GET /cases 200 12ms", organizationId: "org-1" }, ["HTTP"]),
    ).toEqual({
      text: "GET /cases 200 12ms",
      meta: { context: "HTTP", organizationId: "org-1" },
    });
  });

  it("garde un message string et un stack d'erreur", () => {
    expect(nestToWinston("boom", ["Error: boom\n    at foo", "ExceptionsHandler"])).toEqual({
      text: "boom",
      meta: { context: "ExceptionsHandler", stack: "Error: boom\n    at foo" },
    });
  });
});

describe("WinstonNestLoggerAdapter", () => {
  it("envoie un log Nest comme JSON winston (message + context)", () => {
    const winstonLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
    const adapter = new WinstonNestLoggerAdapter(winstonLogger as never);
    adapter.log({ message: "GET /billing/invoices 200 6ms", organizationId: "org-1" }, "HTTP");
    expect(winstonLogger.info).toHaveBeenCalledWith("GET /billing/invoices 200 6ms", {
      context: "HTTP",
      organizationId: "org-1",
    });
  });
});
