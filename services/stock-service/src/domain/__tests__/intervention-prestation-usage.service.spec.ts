import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException } from "@nestjs/common";
import { InterventionPrestationUsageService } from "../intervention-prestation-usage.service";

describe("InterventionPrestationUsageService", () => {
  let service: InterventionPrestationUsageService;
  let mockUsageModel: {
    find: jest.Mock;
    create: jest.Mock;
  };
  let mockPrestationModel: {
    findOne: jest.Mock;
    find: jest.Mock;
  };

  const prestationDoc = {
    _id: { toString: () => "presta-1" },
    organizationId: "org-1",
    name: "Main d'œuvre",
    reference: "MO-H",
    unit: "h",
    defaultPrice: 55,
    defaultTvaRate: 20,
    isActive: true,
  };

  beforeEach(async () => {
    mockUsageModel = {
      find: jest.fn(),
      create: jest.fn(),
    };
    mockPrestationModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterventionPrestationUsageService,
        { provide: getModelToken("InterventionPrestationUsage"), useValue: mockUsageModel },
        { provide: getModelToken("Prestation"), useValue: mockPrestationModel },
      ],
    }).compile();

    service = module.get(InterventionPrestationUsageService);
  });

  it("lists usages for an intervention with prestation catalog fields", async () => {
    const usageDoc = {
      _id: { toString: () => "usage-1" },
      organizationId: "org-1",
      interventionId: "int-1",
      caseId: "case-1",
      prestationId: "presta-1",
      quantity: 2,
      get: jest.fn().mockReturnValue(undefined),
    };
    mockUsageModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([usageDoc]) }),
    });
    mockPrestationModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([prestationDoc]),
    });

    const result = await service.listByIntervention("org-1", "int-1");
    expect(result.usages).toHaveLength(1);
    expect(result.usages[0]).toMatchObject({
      prestationId: "presta-1",
      prestationName: "Main d'œuvre",
      quantity: 2,
      unit: "h",
      defaultPrice: 55,
    });
  });

  it("creates a prestation usage without writing stock movements", async () => {
    mockPrestationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(prestationDoc),
    });
    mockUsageModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });
    const created = {
      _id: { toString: () => "usage-1" },
      organizationId: "org-1",
      interventionId: "int-1",
      caseId: "case-1",
      prestationId: "presta-1",
      quantity: 3,
      get: jest.fn(),
    };
    mockUsageModel.create.mockResolvedValue(created);
    mockUsageModel.find
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([created]) }),
      });
    mockPrestationModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([prestationDoc]),
    });

    const result = await service.replaceUsages("int-1", {
      organizationId: "org-1",
      caseId: "case-1",
      usages: [{ prestationId: "presta-1", quantity: 3 }],
    });

    expect(mockUsageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        interventionId: "int-1",
        prestationId: "presta-1",
        quantity: 3,
      }),
    );
    expect(result[0]?.quantity).toBe(3);
  });

  it("rejects a prestation from another organization", async () => {
    mockPrestationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.replaceUsages("int-1", {
        organizationId: "org-1",
        usages: [{ prestationId: "foreign", quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockUsageModel.create).not.toHaveBeenCalled();
  });

  it("updates quantity on an existing usage", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const existing = {
      _id: { toString: () => "usage-1" },
      organizationId: "org-1",
      interventionId: "int-1",
      prestationId: "presta-1",
      quantity: 1,
      deletedAt: null as Date | null,
      caseId: "case-1",
      save,
      get: jest.fn(),
    };
    mockPrestationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(prestationDoc),
    });
    mockUsageModel.find
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([existing]),
      })
      .mockReturnValueOnce({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([{ ...existing, quantity: 4 }]),
        }),
      });
    mockPrestationModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([prestationDoc]),
    });

    await service.replaceUsages("int-1", {
      organizationId: "org-1",
      caseId: "case-1",
      usages: [{ prestationId: "presta-1", quantity: 4 }],
    });

    expect(existing.quantity).toBe(4);
    expect(save).toHaveBeenCalled();
    expect(mockUsageModel.create).not.toHaveBeenCalled();
  });
});
