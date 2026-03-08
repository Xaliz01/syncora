import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { OrganizationsService } from "./organizations.service";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";

describe("OrganizationsService", () => {
  let service: OrganizationsService;
  let mockOrganizationModel: {
    create: jest.Mock;
    findById: jest.Mock;
  };

  const mockDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "org-123" },
    name: "Test Org",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    ...overrides
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    mockOrganizationModel = {
      create: jest.fn(),
      findById: jest.fn().mockReturnValue({ exec: execMock })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractOrganizationsService, useClass: OrganizationsService },
        {
          provide: getModelToken("Organization"),
          useValue: mockOrganizationModel
        }
      ]
    }).compile();

    service = module.get<OrganizationsService>(AbstractOrganizationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an organization and return the response", async () => {
      const doc = mockDoc({ name: "Acme Corp" });
      mockOrganizationModel.create.mockResolvedValue(doc);

      const result = await service.create("Acme Corp");

      expect(mockOrganizationModel.create).toHaveBeenCalledWith({ name: "Acme Corp" });
      expect(result).toEqual({
        id: "org-123",
        name: "Acme Corp",
        createdAt: new Date("2025-01-01").toISOString()
      });
    });
  });

  describe("findById", () => {
    it("should return organization when found", async () => {
      const doc = mockDoc({ name: "Found Org" });
      mockOrganizationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.findById("org-123");

      expect(mockOrganizationModel.findById).toHaveBeenCalledWith("org-123");
      expect(result).toEqual({
        id: "org-123",
        name: "Found Org",
        createdAt: new Date("2025-01-01").toISOString()
      });
    });

    it("should return null when organization is not found", async () => {
      mockOrganizationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });
});
