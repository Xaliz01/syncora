import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { AssistantController } from "../assistant.controller";
import { AbstractAssistantService } from "../../../domain/ports/assistant.service.port";
import { AssistantService } from "../../../domain/assistant.service";
import { AssistantLlmClient } from "../../../infrastructure/assistant/llm.client";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";

describe("AssistantController", () => {
  const user: AuthUser = {
    id: "u1",
    email: "a@example.com",
    organizationId: "org1",
    role: "member",
    status: "active",
    permissions: ["cases.read"],
  };

  let controller: AssistantController;
  let chat: jest.Mock;

  beforeEach(async () => {
    chat = jest.fn().mockResolvedValue({
      conversationId: "c1",
      reply: "ok",
      suggestions: [{ label: "Planning", href: "/cases/calendar" }],
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [{ provide: AbstractAssistantService, useValue: { chat } }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(AssistantController);
  });

  it("refuse un message vide", async () => {
    await expect(controller.chat(user, { message: "  " })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(chat).not.toHaveBeenCalled();
  });

  it("délègue un message valide", async () => {
    const res = await controller.chat(user, { message: "où est le planning ?", pathname: "/" });
    expect(chat).toHaveBeenCalledWith(user, {
      message: "où est le planning ?",
      pathname: "/",
      conversationId: undefined,
    });
    expect(res.reply).toBe("ok");
  });
});

describe("AssistantService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("filtre les suggestions hors permission", async () => {
    process.env.ASSISTANT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "test-key";

    const llm = {
      isConfigured: () => true,
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          reply: "Voici le planning et la facturation.",
          suggestions: [
            { label: "Planning", href: "/cases/calendar" },
            { label: "Facturation", href: "/billing" },
            { label: "Hack", href: "https://evil.example" },
          ],
          escalateToSupport: false,
        }),
        provider: "openai",
      }),
    } as unknown as AssistantLlmClient;

    const service = new AssistantService(llm);
    const result = await service.chat(
      {
        id: "u1",
        email: "a@example.com",
        organizationId: "org1",
        role: "member",
        status: "active",
        permissions: ["cases.read"],
      },
      { message: "où est le planning ?" },
    );

    expect(result.suggestions.map((s) => s.href)).toEqual(["/cases/calendar"]);
    expect(result.reply).toContain("planning");
  });

  it("refuse si ASSISTANT_ENABLED=false", async () => {
    process.env.ASSISTANT_ENABLED = "false";
    process.env.OPENAI_API_KEY = "test-key";

    const service = new AssistantService({
      isConfigured: () => true,
      complete: jest.fn(),
    } as unknown as AssistantLlmClient);

    await expect(
      service.chat(
        {
          id: "u1",
          email: "a@example.com",
          organizationId: "org1",
          role: "admin",
          status: "active",
          permissions: [],
        },
        { message: "bonjour" },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
