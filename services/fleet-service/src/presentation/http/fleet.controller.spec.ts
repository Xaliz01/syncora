import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { FleetController } from "./fleet.controller";
import { AbstractFleetService } from "../../domain/ports/fleet.service.port";

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
      assignTechnicianToVehicle: jest.fn(),
      unassignTechnicianFromVehicle: jest.fn(),
      createTechnician: jest.fn(),
      listTechnicians: jest.fn(),
      getTechnician: jest.fn(),
      updateTechnician: jest.fn(),
      deleteTechnician: jest.fn(),
      linkUserToTechnician: jest.fn()
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

  describe("createTechnician", () => {
    it("should call fleetService.createTechnician with body", async () => {
      const body = {
        organizationId: "org-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com"
      };
      mockFleetService.createTechnician.mockResolvedValue({ id: "t1", ...body } as never);

      const result = await controller.createTechnician(body);

      expect(mockFleetService.createTechnician).toHaveBeenCalledWith(body);
      expect(result.id).toBe("t1");
    });
  });

  describe("listTechnicians", () => {
    it("should call fleetService.listTechnicians with organizationId", async () => {
      mockFleetService.listTechnicians.mockResolvedValue([{ id: "t1" }] as never);

      const result = await controller.listTechnicians("org-1");

      expect(mockFleetService.listTechnicians).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listTechnicians(undefined as never)).rejects.toThrow(
        BadRequestException
      );
      expect(mockFleetService.listTechnicians).not.toHaveBeenCalled();
    });
  });
});
