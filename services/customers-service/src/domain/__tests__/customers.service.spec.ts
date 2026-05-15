import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@syncora/shared";
import { CustomersService } from "../customers.service";
import { AbstractCustomersService } from "../ports/customers.service.port";

describe("CustomersService", () => {
  let service: CustomersService;
  let mockCustomerModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const mockCustomerDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "cust-123" },
    organizationId: "org-1",
    kind: "company" as const,
    firstName: undefined,
    lastName: undefined,
    companyName: "Acme Corp",
    legalIdentifier: "SIREN123",
    email: "contact@acme.fr",
    phone: "0102030405",
    mobile: "0601020304",
    address: {
      line1: "1 rue de Paris",
      line2: undefined,
      postalCode: "75001",
      city: "Paris",
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

    mockCustomerModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractCustomersService, useClass: CustomersService },
        { provide: getModelToken("Customer"), useValue: mockCustomerModel },
      ],
    }).compile();

    service = module.get<AbstractCustomersService>(AbstractCustomersService) as CustomersService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createCustomer", () => {
    it("should throw BadRequestException for company without companyName", async () => {
      const body = {
        organizationId: "org-1",
        kind: "company" as const,
        companyName: "",
      };

      await expect(service.createCustomer(body)).rejects.toThrow(BadRequestException);
      expect(mockCustomerModel.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for individual without firstName or lastName", async () => {
      const body = {
        organizationId: "org-1",
        kind: "individual" as const,
      };

      await expect(service.createCustomer(body)).rejects.toThrow(BadRequestException);
      expect(mockCustomerModel.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for incomplete address", async () => {
      const body = {
        organizationId: "org-1",
        kind: "company" as const,
        companyName: "Acme Corp",
        address: { line1: "", postalCode: "75001", city: "Paris", country: "FR" },
      };

      await expect(service.createCustomer(body)).rejects.toThrow(BadRequestException);
      expect(mockCustomerModel.create).not.toHaveBeenCalled();
    });

    it("should create a valid company customer", async () => {
      const doc = mockCustomerDoc();
      mockCustomerModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        kind: "company" as const,
        companyName: "Acme Corp",
        email: "contact@acme.fr",
      };

      const result = await service.createCustomer(body);

      expect(mockCustomerModel.create).toHaveBeenCalled();
      expect(result.id).toBe("cust-123");
      expect(result.companyName).toBe("Acme Corp");
    });

    it("should create a valid individual customer", async () => {
      const doc = mockCustomerDoc({
        kind: "individual",
        firstName: "Jean",
        lastName: "Dupont",
        companyName: undefined,
      });
      mockCustomerModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        kind: "individual" as const,
        firstName: "Jean",
        lastName: "Dupont",
      };

      const result = await service.createCustomer(body);

      expect(mockCustomerModel.create).toHaveBeenCalled();
      expect(result.id).toBe("cust-123");
      expect(result.firstName).toBe("Jean");
      expect(result.lastName).toBe("Dupont");
    });
  });

  describe("listCustomers", () => {
    it("should return list with search filter", async () => {
      const docs = [mockCustomerDoc()];
      mockCustomerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
        }),
      });

      const result = await service.listCustomers("org-1", { search: "acme" });

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          ...activeDocumentFilter,
          $or: expect.arrayContaining([
            { companyName: { $regex: "acme", $options: "i" } },
          ]),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it("should return list with ids filter", async () => {
      const docs = [mockCustomerDoc()];
      mockCustomerModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
        }),
      });

      const result = await service.listCustomers("org-1", { ids: ["cust-123", "cust-456"] });

      expect(mockCustomerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          ...activeDocumentFilter,
          _id: { $in: ["cust-123", "cust-456"] },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("getCustomer", () => {
    it("should return customer when found", async () => {
      const doc = mockCustomerDoc();
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCustomer("cust-123", "org-1");

      expect(mockCustomerModel.findOne).toHaveBeenCalledWith({
        _id: "cust-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(result.id).toBe("cust-123");
    });

    it("should throw NotFoundException when not found", async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getCustomer("non-existent", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateCustomer", () => {
    it("should update and return customer", async () => {
      const doc = mockCustomerDoc({ companyName: "Acme Updated" });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        companyName: "Acme Updated",
      };

      const result = await service.updateCustomer("cust-123", body);

      expect(mockCustomerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "cust-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: expect.objectContaining({ companyName: "Acme Updated" }) },
        { new: true },
      );
      expect(result.id).toBe("cust-123");
      expect(result.companyName).toBe("Acme Updated");
    });

    it("should throw NotFoundException when not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = {
        organizationId: "org-1",
        companyName: "Acme Updated",
      };

      await expect(service.updateCustomer("non-existent", body)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteCustomer", () => {
    it("should soft-delete customer successfully", async () => {
      const doc = mockCustomerDoc();
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteCustomer("cust-123", "org-1");

      expect(mockCustomerModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "cust-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: { deletedAt: expect.any(Date) } },
        { new: true },
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteCustomer("non-existent", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
