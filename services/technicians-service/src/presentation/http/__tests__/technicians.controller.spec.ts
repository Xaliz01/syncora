import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { TechniciansController } from "../technicians.controller";
import { AbstractTechniciansService } from "../../../domain/ports/technicians.service.port";

describe("TechniciansController", () => {
  let controller: TechniciansController;
  let mockTechniciansService: jest.Mocked<AbstractTechniciansService>;

  beforeEach(async () => {
    mockTechniciansService = {
      createTechnician: jest.fn(),
      updateTechnician: jest.fn(),
      getTechnician: jest.fn(),
      listTechnicians: jest.fn(),
      deleteTechnician: jest.fn(),
      linkUserToTechnician: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechniciansController],
      providers: [
        {
          provide: AbstractTechniciansService,
          useValue: mockTechniciansService,
        },
      ],
    }).compile();

    controller = module.get<TechniciansController>(TechniciansController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTechnician", () => {
    it("should call techniciansService.createTechnician with body", async () => {
      const body = {
        organizationId: "org-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      mockTechniciansService.createTechnician.mockResolvedValue({ id: "t1", ...body } as never);

      const result = await controller.createTechnician(body);

      expect(mockTechniciansService.createTechnician).toHaveBeenCalledWith(body);
      expect(result.id).toBe("t1");
    });
  });

  describe("listTechnicians", () => {
    it("should call techniciansService.listTechnicians with organizationId", async () => {
      mockTechniciansService.listTechnicians.mockResolvedValue([{ id: "t1" }] as never);

      const result = await controller.listTechnicians("org-1");

      expect(mockTechniciansService.listTechnicians).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listTechnicians(undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTechniciansService.listTechnicians).not.toHaveBeenCalled();
    });
  });

  describe("getTechnician", () => {
    it("should call techniciansService.getTechnician with id and organizationId", async () => {
      mockTechniciansService.getTechnician.mockResolvedValue({ id: "t1" } as never);

      const result = await controller.getTechnician("t1", "org-1");

      expect(mockTechniciansService.getTechnician).toHaveBeenCalledWith("org-1", "t1");
      expect(result.id).toBe("t1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getTechnician("t1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTechniciansService.getTechnician).not.toHaveBeenCalled();
    });
  });

  describe("deleteTechnician", () => {
    it("should call techniciansService.deleteTechnician with id and organizationId", async () => {
      mockTechniciansService.deleteTechnician.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteTechnician("t1", "org-1");

      expect(mockTechniciansService.deleteTechnician).toHaveBeenCalledWith("org-1", "t1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.deleteTechnician("t1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTechniciansService.deleteTechnician).not.toHaveBeenCalled();
    });
  });

  describe("linkUserToTechnician", () => {
    it("should call techniciansService.linkUserToTechnician with params", async () => {
      mockTechniciansService.linkUserToTechnician.mockResolvedValue({
        id: "t1",
        userId: "u1",
      } as never);

      const result = await controller.linkUserToTechnician("t1", "org-1", { userId: "u1" });

      expect(mockTechniciansService.linkUserToTechnician).toHaveBeenCalledWith("org-1", "t1", "u1");
      expect(result.userId).toBe("u1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.linkUserToTechnician("t1", undefined as never, { userId: "u1" }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTechniciansService.linkUserToTechnician).not.toHaveBeenCalled();
    });
  });
});
