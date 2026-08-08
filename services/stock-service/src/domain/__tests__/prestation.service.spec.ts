import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException } from "@nestjs/common";
import { PrestationService } from "../prestation.service";

describe("PrestationService", () => {
  let service: PrestationService;
  let mockPrestationModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    countDocuments: jest.Mock;
    deleteMany: jest.Mock;
  };

  beforeEach(async () => {
    const execMock = jest.fn();
    const sortExecMock = jest.fn();

    mockPrestationModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: sortExecMock }),
          }),
        }),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrestationService,
        { provide: getModelToken("Prestation"), useValue: mockPrestationModel },
      ],
    }).compile();

    service = module.get<PrestationService>(PrestationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createPrestation", () => {
    it("should create a prestation with default TVA 20%", async () => {
      const doc = {
        _id: { toString: () => "presta-1" },
        organizationId: "org-1",
        name: "Main d'œuvre",
        reference: "MO-H",
        unit: "h",
        defaultPrice: 55,
        defaultTvaRate: 20,
        isActive: true,
        get: jest.fn(),
        isTestData: false,
      };
      mockPrestationModel.create.mockResolvedValue(doc);

      const result = await service.createPrestation({
        organizationId: "org-1",
        name: "Main d'œuvre",
        reference: "mo-h",
        defaultPrice: 55,
        unit: "h",
      });

      expect(result.id).toBe("presta-1");
      expect(result.reference).toBe("MO-H");
      expect(result.defaultPrice).toBe(55);
      expect(result.defaultTvaRate).toBe(20);
      expect(mockPrestationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          name: "Main d'œuvre",
          reference: "MO-H",
          defaultPrice: 55,
          defaultTvaRate: 20,
        }),
      );
    });

    it("should throw ConflictException on duplicate reference", async () => {
      mockPrestationModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createPrestation({
          organizationId: "org-1",
          name: "Duplicate",
          reference: "DUP",
          defaultPrice: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
