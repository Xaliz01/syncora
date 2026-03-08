import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { FleetController } from "../fleet.controller";
import { AbstractFleetService } from "../../../domain/ports/fleet.service.port";

describe("FleetController", () => {
  let controller: FleetController;
  let mockFleetService: jest.Mocked<AbstractFleetService>;

  beforeEach(async () => {
    mockFleetService = {
      createVehicle: jest.fn(),
      listVehicles: jest.fn(),
      getVehicle: jest.fn(),
      updateVehicle: jest.fn(),
      deleteVehicle: jest.fn(),
      assignTechnician: jest.fn(),
      unassignTechnician: jest.fn(),
      unassignTechnicianFromAllVehicles: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [
        {
          provide: AbstractFleetService,
          useValue: mockFleetService
        }
      ]
    }).compile();

    controller = module.get<FleetController>(FleetController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createVehicle", () => {
    it("should call fleetService.createVehicle with body", async () => {
      const body = {
        organizationId: "org-1",
        registrationNumber: "AB-123",
        type: "voiture" as const,
        brand: "Brand",
        model: "Model",
        year: 2020
      };
      mockFleetService.createVehicle.mockResolvedValue({ id: "v1", ...body } as never);

      const result = await controller.createVehicle(body);

      expect(mockFleetService.createVehicle).toHaveBeenCalledWith(body);
      expect(result.id).toBe("v1");
    });
  });

  describe("listVehicles", () => {
    it("should call fleetService.listVehicles with organizationId", async () => {
      mockFleetService.listVehicles.mockResolvedValue([{ id: "v1" }] as never);

      const result = await controller.listVehicles("org-1");

      expect(mockFleetService.listVehicles).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listVehicles(undefined as never)).rejects.toThrow(BadRequestException);
      expect(mockFleetService.listVehicles).not.toHaveBeenCalled();
    });
  });

  describe("getVehicle", () => {
    it("should call fleetService.getVehicle with id and organizationId", async () => {
      mockFleetService.getVehicle.mockResolvedValue({ id: "v1" } as never);

      const result = await controller.getVehicle("v1", "org-1");

      expect(mockFleetService.getVehicle).toHaveBeenCalledWith("org-1", "v1");
      expect(result.id).toBe("v1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getVehicle("v1", undefined as never)).rejects.toThrow(
        BadRequestException
      );
      expect(mockFleetService.getVehicle).not.toHaveBeenCalled();
    });
  });

  describe("deleteVehicle", () => {
    it("should call fleetService.deleteVehicle with id and organizationId", async () => {
      mockFleetService.deleteVehicle.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteVehicle("v1", "org-1");

      expect(mockFleetService.deleteVehicle).toHaveBeenCalledWith("org-1", "v1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.deleteVehicle("v1", undefined as never)).rejects.toThrow(
        BadRequestException
      );
      expect(mockFleetService.deleteVehicle).not.toHaveBeenCalled();
    });
  });

  describe("assignTechnician", () => {
    it("should call fleetService.assignTechnician with params", async () => {
      mockFleetService.assignTechnician.mockResolvedValue({
        id: "v1",
        assignedTechnicianId: "tech-1"
      } as never);

      const result = await controller.assignTechnician("v1", "org-1", {
        technicianId: "tech-1"
      });

      expect(mockFleetService.assignTechnician).toHaveBeenCalledWith(
        "org-1",
        "v1",
        "tech-1"
      );
      expect(result.assignedTechnicianId).toBe("tech-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.assignTechnician("v1", undefined as never, { technicianId: "tech-1" })
      ).rejects.toThrow(BadRequestException);
      expect(mockFleetService.assignTechnician).not.toHaveBeenCalled();
    });
  });

  describe("unassignTechnician", () => {
    it("should call fleetService.unassignTechnician with id and organizationId", async () => {
      mockFleetService.unassignTechnician.mockResolvedValue({
        id: "v1",
        assignedTechnicianId: undefined
      } as never);

      const result = await controller.unassignTechnician("v1", "org-1");

      expect(mockFleetService.unassignTechnician).toHaveBeenCalledWith("org-1", "v1");
      expect(result.assignedTechnicianId).toBeUndefined();
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.unassignTechnician("v1", undefined as never)).rejects.toThrow(
        BadRequestException
      );
      expect(mockFleetService.unassignTechnician).not.toHaveBeenCalled();
    });
  });
});
