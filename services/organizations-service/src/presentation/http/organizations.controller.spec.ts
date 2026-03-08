import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { AbstractOrganizationsService } from "../../domain/ports/organizations.service.port";

describe("OrganizationsController", () => {
  let controller: OrganizationsController;
  let mockOrganizationsService: jest.Mocked<AbstractOrganizationsService>;

  beforeEach(async () => {
    mockOrganizationsService = {
      create: jest.fn(),
      findById: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: AbstractOrganizationsService,
          useValue: mockOrganizationsService
        }
      ]
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should call service.create with body.name and return the result", async () => {
      const body = { name: "New Organization" };
      const expected = {
        id: "org-123",
        name: "New Organization",
        createdAt: "2025-01-01T00:00:00.000Z"
      };
      mockOrganizationsService.create.mockResolvedValue(expected);

      const result = await controller.create(body);

      expect(mockOrganizationsService.create).toHaveBeenCalledWith("New Organization");
      expect(result).toEqual(expected);
    });
  });

  describe("findById", () => {
    it("should return organization when found", async () => {
      const org = {
        id: "org-123",
        name: "Test Org",
        createdAt: "2025-01-01T00:00:00.000Z"
      };
      mockOrganizationsService.findById.mockResolvedValue(org);

      const result = await controller.findById("org-123");

      expect(mockOrganizationsService.findById).toHaveBeenCalledWith("org-123");
      expect(result).toEqual(org);
    });

    it("should throw NotFoundException when organization is not found", async () => {
      mockOrganizationsService.findById.mockResolvedValue(null);

      await expect(controller.findById("non-existent")).rejects.toThrow(NotFoundException);
      await expect(controller.findById("non-existent")).rejects.toThrow("Organization not found");
    });
  });
});
