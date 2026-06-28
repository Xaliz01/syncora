import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser } from "@planwise/shared";
import { TrialTestDataService } from "../trial-test-data.service";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";

describe("TrialTestDataService", () => {
  let service: TrialTestDataService;
  const httpGet = jest.fn();
  const httpPatch = jest.fn();
  const httpDelete = jest.fn();
  const getCurrentSubscription = jest.fn();
  const scopedRequest = jest.fn();

  const user: AuthUser = {
    id: "user-1",
    email: "a@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["subscription.active"],
    name: "Admin",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    httpGet.mockReturnValue(
      of({
        data: { status: "none", hasTestData: false, injectedAt: null },
      }),
    );
    httpPatch.mockReturnValue(of({ data: {} }));
    httpDelete.mockReturnValue(of({ data: { purged: true } }));
    getCurrentSubscription.mockResolvedValue({
      status: "trialing",
      hasAccess: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialTestDataService,
        {
          provide: HttpService,
          useValue: {
            get: httpGet,
            patch: httpPatch,
            delete: httpDelete,
          },
        },
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: { getCurrentSubscription },
        },
        {
          provide: OrganizationScopedHttpClient,
          useValue: { request: scopedRequest },
        },
      ],
    }).compile();

    service = module.get(TrialTestDataService);
  });

  it("should reject inject when not trialing", async () => {
    getCurrentSubscription.mockResolvedValue({ status: "active", hasAccess: true });
    await expect(service.inject(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject inject when demo data already ready", async () => {
    httpGet.mockReturnValue(
      of({
        data: { status: "ready", hasTestData: true, injectedAt: new Date().toISOString() },
      }),
    );
    await expect(service.inject(user)).rejects.toBeInstanceOf(ConflictException);
  });

  it("should accept inject and mark organization as injecting", async () => {
    const result = await service.inject(user);
    expect(result).toEqual({ accepted: true });
    expect(httpPatch).toHaveBeenCalledWith(
      expect.stringContaining("/organizations/org-1/trial-test-data"),
      expect.objectContaining({ status: "injecting" }),
    );
  });

  it("should purge all downstream test-data endpoints", async () => {
    await service.purge(user);
    expect(httpDelete).toHaveBeenCalled();
    expect(httpPatch).toHaveBeenCalledWith(
      expect.stringContaining("/trial-test-data"),
      expect.objectContaining({ status: "none" }),
    );
  });
});
