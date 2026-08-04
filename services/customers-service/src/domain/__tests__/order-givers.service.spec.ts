import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { OrderGiversService } from "../order-givers.service";
import { AbstractOrderGiversService } from "../ports/order-givers.service.port";

describe("OrderGiversService", () => {
  let service: OrderGiversService;
  let mockModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    countDocuments: jest.Mock;
  };

  const mockDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "og-123" },
    organizationId: "org-1",
    kind: "company" as const,
    firstName: undefined,
    lastName: undefined,
    companyName: "Donneur SA",
    legalIdentifier: "SIREN999",
    email: "billing@donneur.fr",
    phone: "0102030405",
    mobile: undefined,
    address: {
      line1: "10 avenue du Commerce",
      line2: undefined,
      postalCode: "69001",
      city: "Lyon",
      country: "FR",
    },
    notes: "Note",
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: execMock }) }),
    };

    mockModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractOrderGiversService, useClass: OrderGiversService },
        { provide: getModelToken("OrderGiver"), useValue: mockModel },
      ],
    }).compile();

    service = module.get<AbstractOrderGiversService>(
      AbstractOrderGiversService,
    ) as OrderGiversService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOrderGiver", () => {
    it("should throw BadRequestException for company without companyName", async () => {
      await expect(
        service.createOrderGiver({
          organizationId: "org-1",
          kind: "company",
          companyName: "",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockModel.create).not.toHaveBeenCalled();
    });

    it("should create a valid company order giver", async () => {
      const doc = mockDoc();
      mockModel.create.mockResolvedValue(doc);

      const result = await service.createOrderGiver({
        organizationId: "org-1",
        kind: "company",
        companyName: "Donneur SA",
        email: "billing@donneur.fr",
      });

      expect(result.displayName).toBe("Donneur SA");
      expect(result.id).toBe("og-123");
      expect(mockModel.create).toHaveBeenCalled();
    });
  });

  describe("getOrderGiver", () => {
    it("should throw NotFoundException when missing", async () => {
      mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.getOrderGiver("missing", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteOrderGiver", () => {
    it("should soft-delete", async () => {
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      const result = await service.deleteOrderGiver("og-123", "org-1");
      expect(result).toEqual({ deleted: true });
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "og-123" }),
        expect.objectContaining({ $set: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
        { new: true },
      );
    });
  });
});
