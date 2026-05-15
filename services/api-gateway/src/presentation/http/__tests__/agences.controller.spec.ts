import { Test, TestingModule } from "@nestjs/testing";
import { AgencesGatewayController } from "../agences.controller";
import { AbstractAgencesGatewayService } from "../../../domain/ports/agences.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("AgencesGatewayController", () => {
  let controller: AgencesGatewayController;
  let mockAgencesService: jest.Mocked<AbstractAgencesGatewayService>;

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
    mockAgencesService = {
      createAgence: jest.fn(),
      listAgences: jest.fn(),
      getAgence: jest.fn(),
      updateAgence: jest.fn(),
      deleteAgence: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgencesGatewayController],
      providers: [
        {
          provide: AbstractAgencesGatewayService,
          useValue: mockAgencesService,
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

    controller = module.get<AgencesGatewayController>(AgencesGatewayController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createAgence", () => {
    it("should call agencesService.createAgence with user and body", async () => {
      const body = {
        name: "Agence Paris",
        address: "10 rue de Paris",
        city: "Paris",
        postalCode: "75001",
      };
      mockAgencesService.createAgence.mockResolvedValue({
        id: "agence-1",
        name: "Agence Paris",
      } as never);

      const result = await controller.createAgence(mockUser, body);

      expect(mockAgencesService.createAgence).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "agence-1", name: "Agence Paris" });
    });
  });

  describe("listAgences", () => {
    it("should call agencesService.listAgences with user", async () => {
      mockAgencesService.listAgences.mockResolvedValue([
        { id: "agence-1", name: "Agence Paris" },
      ] as never);

      const result = await controller.listAgences(mockUser);

      expect(mockAgencesService.listAgences).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "agence-1", name: "Agence Paris" }]);
    });
  });

  describe("getAgence", () => {
    it("should call agencesService.getAgence with user and agenceId", async () => {
      mockAgencesService.getAgence.mockResolvedValue({
        id: "agence-1",
        name: "Agence Paris",
      } as never);

      const result = await controller.getAgence(mockUser, "agence-1");

      expect(mockAgencesService.getAgence).toHaveBeenCalledWith(mockUser, "agence-1");
      expect(result).toEqual({ id: "agence-1", name: "Agence Paris" });
    });
  });

  describe("updateAgence", () => {
    it("should call agencesService.updateAgence with user, agenceId and body", async () => {
      const body = { name: "Agence Lyon" };
      mockAgencesService.updateAgence.mockResolvedValue({
        id: "agence-1",
        name: "Agence Lyon",
      } as never);

      const result = await controller.updateAgence(mockUser, "agence-1", body);

      expect(mockAgencesService.updateAgence).toHaveBeenCalledWith(mockUser, "agence-1", body);
      expect(result).toEqual({ id: "agence-1", name: "Agence Lyon" });
    });
  });

  describe("deleteAgence", () => {
    it("should call agencesService.deleteAgence with user and agenceId", async () => {
      mockAgencesService.deleteAgence.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteAgence(mockUser, "agence-1");

      expect(mockAgencesService.deleteAgence).toHaveBeenCalledWith(mockUser, "agence-1");
      expect(result).toEqual({ deleted: true });
    });
  });
});
