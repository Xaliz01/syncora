import { Test, TestingModule } from "@nestjs/testing";
import { CustomersController } from "../customers.controller";
import { AbstractCustomersGatewayService } from "../../../domain/ports/customers.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("CustomersController", () => {
  let controller: CustomersController;
  let mockCustomersService: jest.Mocked<AbstractCustomersGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockCustomersService = {
      createCustomer: jest.fn(),
      listCustomers: jest.fn(),
      listCustomersByIds: jest.fn(),
      getCustomer: jest.fn(),
      updateCustomer: jest.fn(),
      deleteCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: AbstractCustomersGatewayService,
          useValue: mockCustomersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomersController>(CustomersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createCustomer", () => {
    it("should call customersService.createCustomer with user and body", async () => {
      const body = { kind: "individual" as const, firstName: "John", lastName: "Doe" };
      mockCustomersService.createCustomer.mockResolvedValue({ id: "cust-1", kind: "individual" } as never);

      const result = await controller.createCustomer(mockUser, body);

      expect(mockCustomersService.createCustomer).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "cust-1", kind: "individual" });
    });
  });

  describe("listCustomers", () => {
    it("should call customersService.listCustomers with user and search filter", async () => {
      mockCustomersService.listCustomers.mockResolvedValue([{ id: "cust-1" }] as never);

      const result = await controller.listCustomers(mockUser, "John");

      expect(mockCustomersService.listCustomers).toHaveBeenCalledWith(mockUser, { search: "John" });
      expect(result).toEqual([{ id: "cust-1" }]);
    });

    it("should call customersService.listCustomers with undefined search", async () => {
      mockCustomersService.listCustomers.mockResolvedValue([] as never);

      const result = await controller.listCustomers(mockUser);

      expect(mockCustomersService.listCustomers).toHaveBeenCalledWith(mockUser, { search: undefined });
      expect(result).toEqual([]);
    });
  });

  describe("getCustomer", () => {
    it("should call customersService.getCustomer with user and customerId", async () => {
      mockCustomersService.getCustomer.mockResolvedValue({ id: "cust-1" } as never);

      const result = await controller.getCustomer(mockUser, "cust-1");

      expect(mockCustomersService.getCustomer).toHaveBeenCalledWith(mockUser, "cust-1");
      expect(result).toEqual({ id: "cust-1" });
    });
  });

  describe("updateCustomer", () => {
    it("should call customersService.updateCustomer with user, customerId and body", async () => {
      const body = { firstName: "Jane" };
      mockCustomersService.updateCustomer.mockResolvedValue({ id: "cust-1", firstName: "Jane" } as never);

      const result = await controller.updateCustomer(mockUser, "cust-1", body);

      expect(mockCustomersService.updateCustomer).toHaveBeenCalledWith(mockUser, "cust-1", body);
      expect(result).toEqual({ id: "cust-1", firstName: "Jane" });
    });
  });

  describe("deleteCustomer", () => {
    it("should call customersService.deleteCustomer with user and customerId", async () => {
      mockCustomersService.deleteCustomer.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteCustomer(mockUser, "cust-1");

      expect(mockCustomersService.deleteCustomer).toHaveBeenCalledWith(mockUser, "cust-1");
      expect(result).toEqual({ deleted: true });
    });
  });
});
