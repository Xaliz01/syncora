import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { AiFieldReportController } from "../ai-field-report.controller";
import { AbstractAiFieldReportService } from "../../../domain/ports/ai-field-report.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";

describe("AiFieldReportController", () => {
  const user: AuthUser = {
    id: "u1",
    email: "tech@example.com",
    organizationId: "org1",
    role: "admin",
    status: "active",
    permissions: ["interventions.read", "interventions.update", "ai.field_report"],
  };

  let controller: AiFieldReportController;
  let generate: jest.Mock;
  let confirm: jest.Mock;
  let getQuotaStatus: jest.Mock;

  beforeEach(async () => {
    generate = jest.fn().mockResolvedValue({
      draft: "Intervention réalisée le 20/09/2026.",
      quotaRemaining: 19,
    });
    confirm = jest.fn().mockResolvedValue({
      interventionId: "int1",
      fieldReport: "Compte-rendu confirmé.",
      confirmedAt: "2026-09-20T15:00:00.000Z",
    });
    getQuotaStatus = jest.fn().mockResolvedValue({
      usage: "field_report",
      tier: "trial",
      used: 1,
      limit: 20,
      remaining: 19,
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [AiFieldReportController],
      providers: [
        {
          provide: AbstractAiFieldReportService,
          useValue: { generate, confirm, getQuotaStatus },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(AiFieldReportController);
  });

  describe("generate", () => {
    it("rejects missing interventionId", async () => {
      await expect(controller.generate(user, {})).rejects.toBeInstanceOf(BadRequestException);
      expect(generate).not.toHaveBeenCalled();
    });

    it("delegates valid request", async () => {
      const res = await controller.generate(user, { interventionId: "int1" });
      expect(generate).toHaveBeenCalledWith(user, "int1");
      expect(res.draft).toContain("Intervention");
      expect(res.quotaRemaining).toBe(19);
    });
  });

  describe("confirm", () => {
    it("rejects missing interventionId", async () => {
      await expect(controller.confirm(user, { report: "some text" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(confirm).not.toHaveBeenCalled();
    });

    it("rejects empty report", async () => {
      await expect(
        controller.confirm(user, { interventionId: "int1", report: "   " }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(confirm).not.toHaveBeenCalled();
    });

    it("delegates valid confirm", async () => {
      const res = await controller.confirm(user, {
        interventionId: "int1",
        report: "Compte-rendu confirmé.",
      });
      expect(confirm).toHaveBeenCalledWith(user, "int1", "Compte-rendu confirmé.");
      expect(res.fieldReport).toBe("Compte-rendu confirmé.");
    });
  });

  describe("quota", () => {
    it("returns quota status", async () => {
      const res = await controller.getQuota(user);
      expect(getQuotaStatus).toHaveBeenCalledWith(user);
      expect(res.usage).toBe("field_report");
      expect(res.remaining).toBe(19);
    });
  });
});
