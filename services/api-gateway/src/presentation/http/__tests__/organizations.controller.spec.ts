import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { OrganizationsController } from "../organizations.controller";
import { AbstractOrganizationsGatewayService } from "../../../domain/ports/organizations.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("OrganizationsController", () => {
  let controller: OrganizationsController;
  let mockOrganizationsService: jest.Mocked<AbstractOrganizationsGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockOrganizationsService = {
      listMine: jest.fn(),
      getMine: jest.fn(),
      updateMine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: AbstractOrganizationsGatewayService,
          useValue: mockOrganizationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listMine", () => {
    it("should call organizationsService.listMine with user", () => {
      mockOrganizationsService.listMine.mockResolvedValue({ organizations: [{ id: "org-1" }] } as never);

      const result = controller.listMine(mockUser);

      expect(mockOrganizationsService.listMine).toHaveBeenCalledWith(mockUser);
      expect(result).resolves.toEqual({ organizations: [{ id: "org-1" }] });
    });
  });

  describe("getMine", () => {
    it("should call organizationsService.getMine with user and return org", async () => {
      mockOrganizationsService.getMine.mockResolvedValue({ id: "org-1", name: "My Org" } as never);

      const result = await controller.getMine(mockUser);

      expect(mockOrganizationsService.getMine).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ id: "org-1", name: "My Org" });
    });

    it("should throw NotFoundException when organizationsService.getMine returns null", async () => {
      mockOrganizationsService.getMine.mockResolvedValue(null);

      await expect(controller.getMine(mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateMine", () => {
    it("should call organizationsService.updateMine with user and body", async () => {
      const body = { name: "Updated Org" };
      mockOrganizationsService.updateMine.mockResolvedValue({ id: "org-1", name: "Updated Org" } as never);

      const result = await controller.updateMine(mockUser, body);

      expect(mockOrganizationsService.updateMine).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "org-1", name: "Updated Org" });
    });

    it("should throw NotFoundException when organizationsService.updateMine returns null", async () => {
      const body = { name: "Updated Org" };
      mockOrganizationsService.updateMine.mockResolvedValue(null);

      await expect(controller.updateMine(mockUser, body)).rejects.toThrow(NotFoundException);
    });
  });
});
