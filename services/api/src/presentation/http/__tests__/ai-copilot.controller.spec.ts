import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { AiCopilotController } from "../ai-copilot.controller";
import { AbstractAiCopilotService } from "../../../domain/ports/ai-copilot.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";

describe("AiCopilotController", () => {
  const user: AuthUser = {
    id: "u1",
    email: "a@example.com",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["ai.copilot"],
  };

  let controller: AiCopilotController;
  const copilot = {
    createSession: jest.fn().mockResolvedValue({ id: "s1", status: "pending" }),
    decide: jest.fn(),
    listSessions: jest.fn().mockResolvedValue({ sessions: [], total: 0 }),
    getSession: jest.fn(),
    getAudio: jest.fn(),
    getQuota: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AiCopilotController],
      providers: [{ provide: AbstractAiCopilotService, useValue: copilot }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(AiCopilotController);
  });

  it("rejects an empty instruction before the service", async () => {
    await expect(controller.createSession(user, { transcript: "  " })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(copilot.createSession).not.toHaveBeenCalled();
  });

  it("delegates a transcript and a rejection without extra fields", async () => {
    await controller.createSession(user, { transcript: "Note pour le dossier" });
    expect(copilot.createSession).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ transcript: "Note pour le dossier" }),
    );
    await expect(controller.decide(user, "abc", {})).rejects.toBeInstanceOf(BadRequestException);
    await controller.decide(user, "abc", { decision: "reject" });
    expect(copilot.decide).toHaveBeenCalledWith(user, "abc", { decision: "reject" });
  });

  it("lists history with limit and offset", async () => {
    await controller.listSessions(user, "20", "0");
    expect(copilot.listSessions).toHaveBeenCalledWith(user, 20, 0);
  });
});
