import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { activeDocumentFilter } from "@planwise/shared";
import { OrganizationsService } from "../organizations.service";
import { AbstractOrganizationsService } from "../ports/organizations.service.port";

describe("OrganizationsService", () => {
  let service: OrganizationsService;
  let mockOrganizationModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const mockDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "org-123" },
    name: "Test Org",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    mockOrganizationModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: execMock }),
          }),
        }),
        select: jest.fn().mockReturnValue({ exec: execMock }),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractOrganizationsService, useClass: OrganizationsService },
        {
          provide: getModelToken("Organization"),
          useValue: mockOrganizationModel,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(AbstractOrganizationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create an organization with name and siret", async () => {
      const doc = mockDoc({ name: "Acme Corp", siret: "12345678901234" });
      mockOrganizationModel.create.mockResolvedValue(doc);

      const result = await service.create({
        name: "Acme Corp",
        siret: "12345678901234",
        addressLine1: "1 rue de Paris",
        postalCode: "75001",
        city: "Paris",
        country: "FR",
      });

      expect(mockOrganizationModel.create).toHaveBeenCalledWith({
        name: "Acme Corp",
        siret: "12345678901234",
        addressLine1: "1 rue de Paris",
        addressLine2: undefined,
        postalCode: "75001",
        city: "Paris",
        country: "FR",
      });
      expect(result).toEqual({
        id: "org-123",
        name: "Acme Corp",
        siret: "12345678901234",
        createdAt: new Date("2025-01-01").toISOString(),
      });
    });
  });

  describe("findById", () => {
    it("should return organization when found", async () => {
      const doc = mockDoc({ name: "Found Org", siret: "11111111111111" });
      mockOrganizationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.findById("org-123");

      expect(mockOrganizationModel.findOne).toHaveBeenCalledWith({
        _id: "org-123",
        ...activeDocumentFilter,
      });
      expect(result).toEqual({
        id: "org-123",
        name: "Found Org",
        siret: "11111111111111",
        createdAt: new Date("2025-01-01").toISOString(),
      });
    });

    it("should return null when organization is not found", async () => {
      mockOrganizationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });
});
