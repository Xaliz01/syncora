import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "../app.controller";
import { AbstractAppService } from "../../../domain/ports/app.service.port";

describe("AppController", () => {
  let controller: AppController;
  let mockAppService: jest.Mocked<AbstractAppService>;

  beforeEach(async () => {
    mockAppService = {
      getHealth: jest.fn().mockReturnValue({
        status: "ok",
        service: "api-gateway",
        version: "v0.1.0",
        gitSha: "a1b2c3d",
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AbstractAppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getHealth", () => {
    it("should return health status with status ok and service api-gateway", () => {
      const result = controller.getHealth();

      expect(mockAppService.getHealth).toHaveBeenCalled();
      expect(result).toEqual({
        status: "ok",
        service: "api-gateway",
        version: "v0.1.0",
        gitSha: "a1b2c3d",
      });
    });
  });
});
