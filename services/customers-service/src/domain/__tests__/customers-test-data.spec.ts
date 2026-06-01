import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { CustomersService } from "../customers.service";

describe("CustomersService purgeTestData", () => {
  const deleteMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getModelToken("Customer"),
          useValue: { deleteMany },
        },
      ],
    }).compile();
    const service = module.get(CustomersService);
    await service.purgeTestData("org-1");
  });

  it("should delete customers marked as test data for the organization", () => {
    expect(deleteMany).toHaveBeenCalledWith({ organizationId: "org-1", isTestData: true });
  });
});
