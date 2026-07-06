import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CustomersService } from "../customers.service";
import { AbstractCustomersService } from "../ports/customers.service.port";

describe("CustomersService — Contacts", () => {
  let service: CustomersService;
  let mockCustomerModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const contactSubDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "contact-1" },
    name: "Jean Dupont",
    role: "Responsable chantier",
    phone: "0102030405",
    mobile: "0601020304",
    email: "jean@exemple.fr",
    notes: "Disponible le matin",
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
    contacts: [],
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

  describe("createContact", () => {
    it("should throw BadRequestException when name is empty", async () => {
      const body = {
        organizationId: "org-1",
        name: "  ",
      };

      await expect(service.createContact("cust-123", body)).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = {
        organizationId: "org-1",
        name: "Jean Dupont",
        role: "Chef chantier",
      };

      await expect(service.createContact("cust-123", body)).rejects.toThrow(NotFoundException);
    });

    it("should create a contact and return it", async () => {
      const newContact = contactSubDoc();
      const doc = mockCustomerDoc({ contacts: [newContact] });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        name: "Jean Dupont",
        role: "Responsable chantier",
        phone: "0102030405",
        mobile: "0601020304",
        email: "jean@exemple.fr",
      };

      const result = await service.createContact("cust-123", body);

      expect(result.id).toBe("contact-1");
      expect(result.name).toBe("Jean Dupont");
      expect(result.role).toBe("Responsable chantier");
      expect(result.phone).toBe("0102030405");
      expect(result.email).toBe("jean@exemple.fr");
    });
  });

  describe("updateContact", () => {
    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const body = { organizationId: "org-1", name: "Updated" };

      await expect(service.updateContact("cust-123", "contact-1", body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when contact not found", async () => {
      const doc = mockCustomerDoc({ contacts: [] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", name: "Updated" };

      await expect(service.updateContact("cust-123", "contact-999", body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should update contact name and save", async () => {
      const contact = contactSubDoc();
      const doc = mockCustomerDoc({ contacts: [contact] });
      doc.save = jest.fn().mockResolvedValue(doc);
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", name: "Pierre Martin" };

      const result = await service.updateContact("cust-123", "contact-1", body);

      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe("contact-1");
      expect(result.name).toBe("Pierre Martin");
    });

    it("should throw BadRequestException for empty name", async () => {
      const contact = contactSubDoc();
      const doc = mockCustomerDoc({ contacts: [contact] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", name: "   " };

      await expect(service.updateContact("cust-123", "contact-1", body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should clear optional fields when set to null", async () => {
      const contact = contactSubDoc();
      const doc = mockCustomerDoc({ contacts: [contact] });
      doc.save = jest.fn().mockResolvedValue(doc);
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = { organizationId: "org-1", role: null, phone: null, notes: null };

      const result = await service.updateContact("cust-123", "contact-1", body);

      expect(result.role).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe("deleteContact", () => {
    it("should throw NotFoundException when customer not found", async () => {
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteContact("cust-123", "contact-1", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delete contact from customer", async () => {
      const doc = mockCustomerDoc({ contacts: [] });
      mockCustomerModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteContact("cust-123", "contact-1", "org-1");

      expect(result).toEqual({ deleted: true });
      expect(mockCustomerModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $pull: { contacts: { _id: "contact-1" } } },
        { new: true },
      );
    });
  });

  describe("toCustomerResponse includes contacts", () => {
    it("should include contacts array in response when contacts exist", async () => {
      const contact = contactSubDoc();
      const doc = mockCustomerDoc({ contacts: [contact] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCustomer("cust-123", "org-1");

      expect(result.contacts).toBeDefined();
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts![0].id).toBe("contact-1");
      expect(result.contacts![0].name).toBe("Jean Dupont");
      expect(result.contacts![0].role).toBe("Responsable chantier");
    });

    it("should return undefined contacts when no contacts", async () => {
      const doc = mockCustomerDoc({ contacts: [] });
      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getCustomer("cust-123", "org-1");

      expect(result.contacts).toBeUndefined();
    });
  });
});
