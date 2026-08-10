import { CustomersDataImportService } from "../customers-data-import.service";

describe("CustomersDataImportService", () => {
  const customerModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const orderGiverModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  let service: CustomersDataImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CustomersDataImportService(customerModel as never, orderGiverModel as never);
  });

  it("creates a customer with importExternalId", async () => {
    customerModel.findOne.mockReturnValue({ exec: async () => null });
    customerModel.create.mockImplementation(async (payload: Record<string, unknown>) => ({
      _id: { toString: () => "cust-1" },
      ...payload,
    }));

    const result = await service.importCustomers({
      organizationId: "org-1",
      rows: [
        {
          externalId: "CLI-1",
          kind: "company",
          companyName: "Acme",
        },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.mappings[0]).toEqual({
      externalId: "CLI-1",
      id: "cust-1",
      action: "created",
    });
    expect(customerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ importExternalId: "CLI-1", companyName: "Acme" }),
    );
  });

  it("upserts when externalId already exists", async () => {
    const existing = {
      _id: { toString: () => "cust-1" },
      save: jest.fn().mockResolvedValue(undefined),
    };
    customerModel.findOne.mockReturnValue({ exec: async () => existing });

    const result = await service.importCustomers({
      organizationId: "org-1",
      rows: [{ externalId: "CLI-1", kind: "company", companyName: "Acme Updated" }],
    });

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(result.mappings[0]?.action).toBe("updated");
    expect(existing.save).toHaveBeenCalled();
  });

  it("hard-deletes created customers", async () => {
    const deleteMany = jest.fn().mockReturnValue({
      exec: async () => ({ deletedCount: 2 }),
    });
    const svc = new CustomersDataImportService(
      { findOne: jest.fn(), create: jest.fn(), deleteMany } as never,
      orderGiverModel as never,
    );
    const id1 = "507f1f77bcf86cd799439011";
    const id2 = "507f1f77bcf86cd799439012";
    const result = await svc.deleteCreated({
      organizationId: "org-1",
      entity: "customers",
      ids: [id1, id2],
    });
    expect(result.deleted).toBe(2);
    expect(deleteMany).toHaveBeenCalled();
  });

  it("hard-deletes created customer sites via $pull", async () => {
    const siteId = "507f1f77bcf86cd799439013";
    const find = jest.fn().mockReturnValue({
      select: () => ({
        exec: async () => [
          {
            sites: [{ _id: { toString: () => siteId } }],
          },
        ],
      }),
    });
    const updateMany = jest.fn().mockReturnValue({ exec: async () => ({ modifiedCount: 1 }) });
    const svc = new CustomersDataImportService(
      { findOne: jest.fn(), create: jest.fn(), find, updateMany } as never,
      orderGiverModel as never,
    );
    const result = await svc.deleteCreated({
      organizationId: "org-1",
      entity: "customer_sites",
      ids: [siteId],
    });
    expect(result.deleted).toBe(1);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1" }),
      expect.objectContaining({ $pull: expect.any(Object) }),
    );
  });
});
