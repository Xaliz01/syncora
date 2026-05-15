import { Test, TestingModule } from "@nestjs/testing";
import { FleetController } from "../fleet.controller";
import { AbstractFleetGatewayService } from "../../../domain/ports/fleet.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("FleetController", () => {
  let controller: FleetController;
  let mockFleetService: jest.Mocked<AbstractFleetGatewayService>;

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
    mockFleetService = {
      createVehicle: jest.fn(),
      listVehicles: jest.fn(),
      getVehicle: jest.fn(),
      updateVehicle: jest.fn(),
      deleteVehicle: jest.fn(),
      assignTeamToVehicle: jest.fn(),
      unassignTeamFromVehicle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [
        {
          provide: AbstractFleetGatewayService,
          useValue: mockFleetService,
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

    controller = module.get<FleetController>(FleetController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createVehicle", () => {
    it("should call fleetService.createVehicle with user and body", async () => {
      const body = { type: "camionnette" as const, registrationNumber: "AB-123-CD", brand: "Renault" };
      mockFleetService.createVehicle.mockResolvedValue({ id: "v-1", registrationNumber: "AB-123-CD" } as never);

      const result = await controller.createVehicle(mockUser, body);

      expect(mockFleetService.createVehicle).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "v-1", registrationNumber: "AB-123-CD" });
    });
  });

  describe("listVehicles", () => {
    it("should call fleetService.listVehicles with user", async () => {
      mockFleetService.listVehicles.mockResolvedValue([{ id: "v-1" }] as never);

      const result = await controller.listVehicles(mockUser);

      expect(mockFleetService.listVehicles).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "v-1" }]);
    });
  });

  describe("getVehicle", () => {
    it("should call fleetService.getVehicle with user and vehicleId", async () => {
      mockFleetService.getVehicle.mockResolvedValue({ id: "v-1" } as never);

      const result = await controller.getVehicle(mockUser, "v-1");

      expect(mockFleetService.getVehicle).toHaveBeenCalledWith(mockUser, "v-1");
      expect(result).toEqual({ id: "v-1" });
    });
  });

  describe("updateVehicle", () => {
    it("should call fleetService.updateVehicle with user, vehicleId and body", async () => {
      const body = { brand: "Peugeot" };
      mockFleetService.updateVehicle.mockResolvedValue({ id: "v-1", brand: "Peugeot" } as never);

      const result = await controller.updateVehicle(mockUser, "v-1", body);

      expect(mockFleetService.updateVehicle).toHaveBeenCalledWith(mockUser, "v-1", body);
      expect(result).toEqual({ id: "v-1", brand: "Peugeot" });
    });
  });

  describe("deleteVehicle", () => {
    it("should call fleetService.deleteVehicle with user and vehicleId", async () => {
      mockFleetService.deleteVehicle.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteVehicle(mockUser, "v-1");

      expect(mockFleetService.deleteVehicle).toHaveBeenCalledWith(mockUser, "v-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("assignTeam", () => {
    it("should call fleetService.assignTeamToVehicle with user, vehicleId and body", async () => {
      const body = { teamId: "team-1" };
      mockFleetService.assignTeamToVehicle.mockResolvedValue({ id: "v-1", assignedTeamId: "team-1" } as never);

      const result = await controller.assignTeam(mockUser, "v-1", body);

      expect(mockFleetService.assignTeamToVehicle).toHaveBeenCalledWith(mockUser, "v-1", body);
      expect(result).toEqual({ id: "v-1", assignedTeamId: "team-1" });
    });
  });

  describe("unassignTeam", () => {
    it("should call fleetService.unassignTeamFromVehicle with user and vehicleId", async () => {
      mockFleetService.unassignTeamFromVehicle.mockResolvedValue({ id: "v-1", assignedTeamId: null } as never);

      const result = await controller.unassignTeam(mockUser, "v-1");

      expect(mockFleetService.unassignTeamFromVehicle).toHaveBeenCalledWith(mockUser, "v-1");
      expect(result).toEqual({ id: "v-1", assignedTeamId: null });
    });
  });
});
