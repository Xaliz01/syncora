import { Test, TestingModule } from "@nestjs/testing";
import { TrialTestDataController } from "../trial-test-data.controller";
import { AbstractTrialTestDataService } from "../../../domain/ports/trial-test-data.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { AdminRoleGuard } from "../../../infrastructure/admin-role.guard";
import type { AuthUser } from "@syncora/shared";

describe("TrialTestDataController", () => {
  let controller: TrialTestDataController;
  let mockTrialTestDataService: jest.Mocked<AbstractTrialTestDataService>;

  const mockAdmin: AuthUser = {
    id: "user-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  beforeEach(async () => {
    mockTrialTestDataService = {
      getStatus: jest.fn(),
      inject: jest.fn(),
      purge: jest.fn(),
      purgeOrganization: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrialTestDataController],
      providers: [
        {
          provide: AbstractTrialTestDataService,
          useValue: mockTrialTestDataService,
        },
        AdminRoleGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TrialTestDataController>(TrialTestDataController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getStatus", () => {
    it("should call trialTestDataService.getStatus with user", async () => {
      const expected = {
        status: "none" as const,
        hasTestData: false,
        injectedAt: null,
        errorMessage: null,
      };
      mockTrialTestDataService.getStatus.mockResolvedValue(expected);

      await expect(controller.getStatus(mockAdmin)).resolves.toEqual(expected);
      expect(mockTrialTestDataService.getStatus).toHaveBeenCalledWith(mockAdmin);
    });
  });

  describe("inject", () => {
    it("should call trialTestDataService.inject with user", async () => {
      mockTrialTestDataService.inject.mockResolvedValue({ accepted: true });

      await expect(controller.inject(mockAdmin)).resolves.toEqual({ accepted: true });
      expect(mockTrialTestDataService.inject).toHaveBeenCalledWith(mockAdmin);
    });
  });

  describe("purge", () => {
    it("should call trialTestDataService.purge with user", async () => {
      mockTrialTestDataService.purge.mockResolvedValue({ purged: true });

      await expect(controller.purge(mockAdmin)).resolves.toEqual({ purged: true });
      expect(mockTrialTestDataService.purge).toHaveBeenCalledWith(mockAdmin);
    });
  });
});
