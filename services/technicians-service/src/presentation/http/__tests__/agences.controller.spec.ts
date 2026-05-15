import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AgencesController } from "../agences.controller";
import { AbstractAgencesService } from "../../../domain/ports/agences.service.port";

describe("AgencesController", () => {
  let controller: AgencesController;
  let mockAgencesService: jest.Mocked<AbstractAgencesService>;

  beforeEach(async () => {
    mockAgencesService = {
      createAgence: jest.fn(),
      updateAgence: jest.fn(),
      getAgence: jest.fn(),
      listAgences: jest.fn(),
      deleteAgence: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgencesController],
      providers: [
        {
          provide: AbstractAgencesService,
          useValue: mockAgencesService,
        },
      ],
    }).compile();

    controller = module.get<AgencesController>(AgencesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createAgence", () => {
    it("should call agencesService.createAgence with body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Agence Paris",
      };
      mockAgencesService.createAgence.mockResolvedValue({ id: "a1", ...body } as never);

      const result = await controller.createAgence(body);

      expect(mockAgencesService.createAgence).toHaveBeenCalledWith(body);
      expect(result.id).toBe("a1");
    });
  });

  describe("listAgences", () => {
    it("should call agencesService.listAgences with organizationId", async () => {
      mockAgencesService.listAgences.mockResolvedValue([{ id: "a1" }] as never);

      const result = await controller.listAgences("org-1");

      expect(mockAgencesService.listAgences).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listAgences(undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAgencesService.listAgences).not.toHaveBeenCalled();
    });
  });

  describe("getAgence", () => {
    it("should call agencesService.getAgence with id and organizationId", async () => {
      mockAgencesService.getAgence.mockResolvedValue({ id: "a1" } as never);

      const result = await controller.getAgence("a1", "org-1");

      expect(mockAgencesService.getAgence).toHaveBeenCalledWith("org-1", "a1");
      expect(result.id).toBe("a1");
    });
  });

  describe("updateAgence", () => {
    it("should call agencesService.updateAgence with organizationId, id, and body", async () => {
      const body = { name: "Agence Lyon" };
      mockAgencesService.updateAgence.mockResolvedValue({ id: "a1", name: "Agence Lyon" } as never);

      const result = await controller.updateAgence("a1", "org-1", body);

      expect(mockAgencesService.updateAgence).toHaveBeenCalledWith("org-1", "a1", body);
      expect(result.name).toBe("Agence Lyon");
    });
  });

  describe("deleteAgence", () => {
    it("should call agencesService.deleteAgence with id and organizationId", async () => {
      mockAgencesService.deleteAgence.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteAgence("a1", "org-1");

      expect(mockAgencesService.deleteAgence).toHaveBeenCalledWith("org-1", "a1");
      expect(result).toEqual({ deleted: true });
    });
  });
});
