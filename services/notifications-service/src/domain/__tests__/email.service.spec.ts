import { EmailService } from "../email.service";

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.NODE_ENV;
    service = new EmailService();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isConfigured", () => {
    it("should return false when SMTP is not configured", () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("sendNotificationEmail", () => {
    it("should return sent: false with reason when SMTP is not configured", async () => {
      const result = await service.sendNotificationEmail(
        "test@example.com",
        "Test Subject",
        "Test body",
        "/cases/123",
      );

      expect(result).toEqual({ sent: false, reason: "smtp_not_configured" });
    });
  });
});

describe("EmailService (configured)", () => {
  let service: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "password123";
    process.env.SMTP_FROM = "Test <noreply@test.com>";
    process.env.APP_URL = "https://app.test.com";

    service = new EmailService();

    mockSendMail = jest.fn().mockResolvedValue({ messageId: "msg-123" });
    (service as unknown as { transporter: { sendMail: jest.Mock } }).transporter = {
      sendMail: mockSendMail,
    } as unknown as typeof service extends { transporter: infer T } ? T : never;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.APP_URL;
  });

  it("should return isConfigured true", () => {
    expect(service.isConfigured()).toBe(true);
  });

  it("should send email with correct parameters", async () => {
    const result = await service.sendNotificationEmail(
      "tech@company.fr",
      "Intervention démarrée",
      "Jean a démarré l'intervention « Plomberie 12 rue X »",
      "/cases/abc-123",
    );

    expect(result).toEqual({ sent: true });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Test <noreply@test.com>",
        to: "tech@company.fr",
        subject: "[Planwise] Intervention démarrée",
      }),
    );
  });

  it("should include url in plain text and html when provided", async () => {
    await service.sendNotificationEmail("user@example.com", "Subject", "Body", "/my-day");

    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain("https://app.test.com/my-day");
    expect(call.html).toContain("https://app.test.com/my-day");
  });

  it("should handle send errors gracefully", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));

    const result = await service.sendNotificationEmail("user@example.com", "Subject", "Body");

    expect(result).toEqual({ sent: false, reason: "SMTP connection refused" });
  });
});

describe("EmailService (local environment)", () => {
  let service: EmailService;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "password123";

    service = new EmailService();

    mockSendMail = jest.fn().mockResolvedValue({ messageId: "msg-123" });
    (service as unknown as { transporter: { sendMail: jest.Mock } }).transporter = {
      sendMail: mockSendMail,
    } as unknown as typeof service extends { transporter: infer T } ? T : never;
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it("should block emails to recipients other than the local allowlist address", async () => {
    const result = await service.sendNotificationEmail("tech@company.fr", "Subject", "Body");

    expect(result).toEqual({ sent: false, reason: "local_recipient_not_allowed" });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("should allow emails to the local allowlist address", async () => {
    const result = await service.sendNotificationEmail("mail@benoistbabin.fr", "Subject", "Body");

    expect(result).toEqual({ sent: true });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "mail@benoistbabin.fr" }),
    );
  });

  it("should match the allowlist address case-insensitively", async () => {
    const result = await service.sendNotificationEmail("Mail@BenoistBabin.fr", "Subject", "Body");

    expect(result).toEqual({ sent: true });
    expect(mockSendMail).toHaveBeenCalled();
  });
});
