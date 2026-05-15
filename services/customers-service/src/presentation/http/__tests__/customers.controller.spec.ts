import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CustomersController } from "../customers.controller";
import { AbstractCustomersService } from "../../../domain/ports/customers.service.port";

describe("CustomersController", () => {
  let controller: CustomersController;
  let mockCustomersService: jest.Mocked<AbstractCustomersService>;

  beforeEach(async () => {
    mockCustomersService = {
      createCustomer: jest.fn(),
      listCustomers: jest.fn(),
      getCustomer: jest.fn(),
      updateCustomer: jest.fn(),
      deleteCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: AbstractCustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createCustomer", () => {
    it("should delegate to service", async () => {
      const body = {
        organizationId: "org-1",
        kind: "company" as const,
        companyName: "Acme Corp",
      };
      mockCustomersService.createCustomer.mockResolvedValue({ id: "cust-1", ...body } as never);

      const result = await controller.createCustomer(body);

      expect(mockCustomersService.createCustomer).toHaveBeenCalledWith(body);
      expect(result.id).toBe("cust-1");
    });
  });

  describe("listCustomers", () => {
    it("should call service with organizationId", async () => {
      mockCustomersService.listCustomers.mockResolvedValue([{ id: "cust-1" }] as never);

      const result = await controller.listCustomers("org-1");

      expect(mockCustomersService.listCustomers).toHaveBeenCalledWith("org-1", {
        search: undefined,
        ids: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listCustomers(undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCustomersService.listCustomers).not.toHaveBeenCalled();
    });

    it("should parse CSV ids", async () => {
      mockCustomersService.listCustomers.mockResolvedValue([{ id: "cust-1" }] as never);

      await controller.listCustomers("org-1", undefined, "cust-1,cust-2,cust-3");

      expect(mockCustomersService.listCustomers).toHaveBeenCalledWith("org-1", {
        search: undefined,
        ids: ["cust-1", "cust-2", "cust-3"],
      });
    });
  });

  describe("getCustomer", () => {
    it("should delegate to service", async () => {
      mockCustomersService.getCustomer.mockResolvedValue({ id: "cust-1" } as never);

      const result = await controller.getCustomer("cust-1", "org-1");

      expect(mockCustomersService.getCustomer).toHaveBeenCalledWith("cust-1", "org-1");
      expect(result.id).toBe("cust-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getCustomer("cust-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCustomersService.getCustomer).not.toHaveBeenCalled();
    });
  });

  describe("updateCustomer", () => {
    it("should delegate to service", async () => {
      const body = {
        organizationId: "org-1",
        companyName: "Acme Updated",
      };
      mockCustomersService.updateCustomer.mockResolvedValue({ id: "cust-1", ...body } as never);

      const result = await controller.updateCustomer("cust-1", body);

      expect(mockCustomersService.updateCustomer).toHaveBeenCalledWith("cust-1", body);
      expect(result.id).toBe("cust-1");
    });
  });

  describe("deleteCustomer", () => {
    it("should delegate to service", async () => {
      mockCustomersService.deleteCustomer.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteCustomer("cust-1", "org-1");

      expect(mockCustomersService.deleteCustomer).toHaveBeenCalledWith("cust-1", "org-1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.deleteCustomer("cust-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCustomersService.deleteCustomer).not.toHaveBeenCalled();
    });
  });
});
