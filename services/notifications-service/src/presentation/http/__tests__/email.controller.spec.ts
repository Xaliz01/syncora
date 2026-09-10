import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { EmailController } from "../email.controller";
import { AbstractEmailService } from "../../../domain/ports/email.service.port";

describe("EmailController transactional", () => {
  let controller: EmailController;
  let emailService: {
    isConfigured: jest.Mock;
    sendTransactionalEmail: jest.Mock;
  };

  beforeEach(async () => {
    emailService = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendTransactionalEmail: jest.fn().mockResolvedValue({ sent: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        { provide: AbstractEmailService, useValue: emailService },
        { provide: HttpService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    controller = module.get(EmailController);
  });

  it("sends a transactional email without attachments", async () => {
    await controller.sendTransactional({
      to: "client@example.com",
      subject: "Facture",
      body: "Bonjour",
    });
    expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
      "client@example.com",
      "Facture",
      "Bonjour",
      undefined,
      undefined,
      undefined,
      { cc: undefined, attachments: undefined },
    );
  });

  it("forwards a PDF attachment", async () => {
    const attachments = [
      {
        filename: "F-2026-00001.pdf",
        contentType: "application/pdf",
        contentBase64: Buffer.from("%PDF").toString("base64"),
      },
    ];
    await controller.sendTransactional({
      to: "client@example.com",
      subject: "Facture F-2026-00001",
      body: "Ci-joint",
      footer: "Document envoyé depuis Planwise.",
      attachments,
    });
    expect(emailService.sendTransactionalEmail).toHaveBeenCalledWith(
      "client@example.com",
      "Facture F-2026-00001",
      "Ci-joint",
      undefined,
      undefined,
      "Document envoyé depuis Planwise.",
      { cc: undefined, attachments },
    );
  });
});
