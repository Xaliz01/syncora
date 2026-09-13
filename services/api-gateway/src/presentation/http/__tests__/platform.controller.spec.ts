import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { PlatformController } from "../platform.controller";
import { AbstractPlatformService } from "../../../domain/ports/platform/platform.service.port";
import { PlatformJwtAuthGuard } from "../../../infrastructure/platform-jwt-auth.guard";
import { PLATFORM_PROSPECT_BULK_REQUEST_TIMEOUT_MS } from "@planwise/shared";
import type { PlatformAuthUser } from "@planwise/shared";

describe("PlatformController", () => {
  let controller: PlatformController;
  let platformService: {
    sendProspectOutreachBulk: jest.Mock;
    sendProspectOutreach: jest.Mock;
  };

  const staff: PlatformAuthUser = {
    id: "staff-1",
    email: "staff@planwise.fr",
    name: "Staff",
  };

  beforeEach(async () => {
    platformService = {
      sendProspectOutreachBulk: jest.fn().mockResolvedValue({
        sent: 1,
        failed: 0,
        skipped: 0,
        results: [{ siren: "123456789", status: "sent" }],
      }),
      sendProspectOutreach: jest.fn().mockResolvedValue({ sent: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformController],
      providers: [{ provide: AbstractPlatformService, useValue: platformService }],
    })
      .overrideGuard(PlatformJwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PlatformController);
  });

  it("forwards staff identity on bulk outreach and raises the request timeout", async () => {
    const body = {
      templateId: "tpl-1",
      recipients: [{ siren: "123456789", companyName: "A", toEmail: "a@b.fr" }],
    };
    const req = { setTimeout: jest.fn() } as unknown as Request;

    await controller.sendProspectOutreachBulk(staff, body, req);

    expect(req.setTimeout).toHaveBeenCalledWith(PLATFORM_PROSPECT_BULK_REQUEST_TIMEOUT_MS);
    expect(platformService.sendProspectOutreachBulk).toHaveBeenCalledWith(staff, body);
  });

  it("does not alter the socket timeout on unit outreach", async () => {
    const body = {
      siren: "123456789",
      companyName: "A",
      toEmail: "a@b.fr",
      templateId: "tpl-1",
    };

    await controller.sendProspectOutreach(staff, body);

    expect(platformService.sendProspectOutreach).toHaveBeenCalledWith(staff, body);
  });
});
