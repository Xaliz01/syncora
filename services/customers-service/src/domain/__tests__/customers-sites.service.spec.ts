import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CustomersService } from "../customers.service";
import { AbstractCustomersService } from "../ports/customers.service.port";

describe("CustomersService — Sites", () => {
  let service: CustomersService;
  let mockCustomerModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const siteSubDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "site-1" },
    label: "Chantier Paris 15e",
    address: {
      line1: "10 rue de Vaugirard",
      line2: undefined,
      postalCode: "75015",
      city: "Paris",
      country: "FR",
    },
    isDefault: false,
    notes: undefined,
    ...overrides,
  });

  const mockCustomerDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "cust-123" },
    organizationId: "org-1",
    kind: "company" as const,
    firstName: undefined,
    lastName: undefined,
    companyName: "Acme Corp",
    legalIdentifier: undefined,
    email: "contact@acme.fr",
    phone: undefined,
    mobile: undefined,
    address: undefined,
    sites: [],
    notes: undefined,
    isTestData: false,
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    save: jest.fn(),
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

  describe("createSite", () => {
    it("should throw BadRequestException when label is empty", async () => {
      const body = {
        organizationId: "org-1",
        label: "",
        address: {
          line1: "10 rue de Vaugirard",
          postalCode: "75015",
          city: "Paris",
          country: "FR",
        },
      };

      await expect(service.createSite("cust-123", body)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when address is incomplete", async () => {
      const body = {
        organizationId: "org-1",
        label: "Chantier",
        address: { line1: "", postalCode: "75015", city: "Paris", country: "FR" },
      };

      await expect(service.createSite("cust-123", body)).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = {
        organizationId: "org-1",
        label: "Chantier Paris",
        address: {
          line1: "10 rue de Vaugirard",
          postalCode: "75015",
          city: "Paris",
          country: "FR",
        },
      };

      await expect(service.createSite("cust-123", body)).rejects.toThrow(NotFoundException);
    });

    it("should create a site and return it", async () => {
      const newSite = siteSubDoc();
      const doc = mockCustomerDoc({ sites: [newSite] });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        label: "Chantier Paris 15e",
        address: {
          line1: "10 rue de Vaugirard",
          postalCode: "75015",
          city: "Paris",
          country: "FR",
        },
      };

      const result = await service.createSite("cust-123", body);

      expect(result.id).toBe("site-1");
      expect(result.label).toBe("Chantier Paris 15e");
      expect(result.address.line1).toBe("10 rue de Vaugirard");
      expect(result.address.postalCode).toBe("75015");
      expect(result.address.city).toBe("Paris");
    });

    it("should reset isDefault on other sites when creating a default site", async () => {
      const newSite = siteSubDoc({ isDefault: true });
      const doc = mockCustomerDoc({ sites: [newSite] });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        label: "Chantier Paris",
        address: {
          line1: "10 rue de Vaugirard",
          postalCode: "75015",
          city: "Paris",
          country: "FR",
        },
        isDefault: true,
      };

      const result = await service.createSite("cust-123", body);

      expect(result.isDefault).toBe(true);
      expect(mockCustomerModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: { "sites.$[].isDefault": false },
          $push: expect.objectContaining({
            sites: expect.objectContaining({ isDefault: true }),
          }),
        }),
        { new: true },
      );
    });
  });

  describe("updateSite", () => {
    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = { organizationId: "org-1", label: "Updated" };

      await expect(service.updateSite("cust-123", "site-1", body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when site not found", async () => {
      const doc = mockCustomerDoc({ sites: [] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", label: "Updated" };

      await expect(service.updateSite("cust-123", "site-999", body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should update site label and save", async () => {
      const site = siteSubDoc();
      const doc = mockCustomerDoc({ sites: [site] });
      doc.save = jest.fn().mockResolvedValue(doc);
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", label: "New Label" };

      const result = await service.updateSite("cust-123", "site-1", body);

      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe("site-1");
      expect(result.label).toBe("New Label");
    });

    it("should throw BadRequestException for empty label", async () => {
      const site = siteSubDoc();
      const doc = mockCustomerDoc({ sites: [site] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", label: "   " };

      await expect(service.updateSite("cust-123", "site-1", body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("deleteSite", () => {
    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteSite("cust-123", "site-1", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delete site from customer", async () => {
      const doc = mockCustomerDoc({ sites: [] });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteSite("cust-123", "site-1", "org-1");

      expect(result).toEqual({ deleted: true });
      expect(mockCustomerModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $pull: { sites: { _id: "site-1" } } },
        { new: true },
      );
    });
  });

  describe("toCustomerResponse includes sites", () => {
    it("should include sites array in response when sites exist", async () => {
      const site = siteSubDoc();
      const doc = mockCustomerDoc({ sites: [site] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCustomer("cust-123", "org-1");

      expect(result.sites).toBeDefined();
      expect(result.sites).toHaveLength(1);
      expect(result.sites![0].id).toBe("site-1");
      expect(result.sites![0].label).toBe("Chantier Paris 15e");
    });

    it("should return undefined sites when no sites", async () => {
      const doc = mockCustomerDoc({ sites: [] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCustomer("cust-123", "org-1");

      expect(result.sites).toBeUndefined();
    });
  });
});
