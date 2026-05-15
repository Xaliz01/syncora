import { Test, TestingModule } from "@nestjs/testing";
import { TechniciansController } from "../technicians.controller";
import { AbstractTechniciansGatewayService } from "../../../domain/ports/technicians.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("TechniciansController", () => {
  let controller: TechniciansController;
  let mockTechniciansService: jest.Mocked<AbstractTechniciansGatewayService>;

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
    mockTechniciansService = {
      createTechnician: jest.fn(),
      listTechnicians: jest.fn(),
      getTechnician: jest.fn(),
      updateTechnician: jest.fn(),
      deleteTechnician: jest.fn(),
      createTechnicianUserAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechniciansController],
      providers: [
        {
          provide: AbstractTechniciansGatewayService,
          useValue: mockTechniciansService,
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

    controller = module.get<TechniciansController>(TechniciansController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTechnician", () => {
    it("should call techniciansService.createTechnician with user and body", async () => {
      const body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic",
      };
      mockTechniciansService.createTechnician.mockResolvedValue({
        id: "tech-1",
        organizationId: "org-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic",
        status: "actif",
        userId: undefined,
        assignedVehicleIds: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      } as never);

      const result = await controller.createTechnician(mockUser, body);

      expect(mockTechniciansService.createTechnician).toHaveBeenCalledWith(mockUser, body);
      expect(result.id).toBe("tech-1");
      expect(result.firstName).toBe("John");
    });
  });

  describe("listTechnicians", () => {
    it("should call techniciansService.listTechnicians with user", async () => {
      mockTechniciansService.listTechnicians.mockResolvedValue([
        {
          id: "tech-1",
          organizationId: "org-123",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+33123456789",
          speciality: "mechanic",
          status: "actif",
          userId: undefined,
          assignedVehicleIds: [],
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
      ] as never);

      const result = await controller.listTechnicians(mockUser);

      expect(mockTechniciansService.listTechnicians).toHaveBeenCalledWith(mockUser);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tech-1");
    });
  });

  describe("getTechnician", () => {
    it("should call techniciansService.getTechnician with user and technicianId", async () => {
      mockTechniciansService.getTechnician.mockResolvedValue({
        id: "tech-1",
        organizationId: "org-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic",
        status: "actif",
        userId: undefined,
        assignedVehicleIds: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      } as never);

      const result = await controller.getTechnician(mockUser, "tech-1");

      expect(mockTechniciansService.getTechnician).toHaveBeenCalledWith(mockUser, "tech-1");
      expect(result.id).toBe("tech-1");
    });
  });

  describe("updateTechnician", () => {
    it("should call techniciansService.updateTechnician with user, technicianId and body", async () => {
      const body = { firstName: "Jane", lastName: "Smith" };
      mockTechniciansService.updateTechnician.mockResolvedValue({
        id: "tech-1",
        organizationId: "org-123",
        firstName: "Jane",
        lastName: "Smith",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic",
        status: "actif",
        userId: undefined,
        assignedVehicleIds: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      } as never);

      const result = await controller.updateTechnician(mockUser, "tech-1", body);

      expect(mockTechniciansService.updateTechnician).toHaveBeenCalledWith(
        mockUser,
        "tech-1",
        body,
      );
      expect(result.firstName).toBe("Jane");
      expect(result.lastName).toBe("Smith");
    });
  });

  describe("deleteTechnician", () => {
    it("should call techniciansService.deleteTechnician with user and technicianId", async () => {
      mockTechniciansService.deleteTechnician.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteTechnician(mockUser, "tech-1");

      expect(mockTechniciansService.deleteTechnician).toHaveBeenCalledWith(mockUser, "tech-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("createTechnicianAccount", () => {
    it("should call techniciansService.createTechnicianUserAccount with user, technicianId and body", async () => {
      const body = { password: "secret123" };
      mockTechniciansService.createTechnicianUserAccount.mockResolvedValue({
        id: "tech-1",
        organizationId: "org-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic",
        status: "actif",
        userId: "user-456",
        assignedVehicleIds: [],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      } as never);

      const result = await controller.createTechnicianAccount(mockUser, "tech-1", body);

      expect(mockTechniciansService.createTechnicianUserAccount).toHaveBeenCalledWith(
        mockUser,
        "tech-1",
        body,
      );
      expect(result.userId).toBe("user-456");
    });
  });
});
