import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CasesController } from "../cases.controller";
import { AbstractCasesService } from "../../../domain/ports/cases.service.port";

describe("CasesController", () => {
  let controller: CasesController;
  let mockCasesService: jest.Mocked<AbstractCasesService>;

  beforeEach(async () => {
    mockCasesService = {
      createTemplate: jest.fn(),
      listTemplates: jest.fn(),
      getTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      createCase: jest.fn(),
      listCases: jest.fn(),
      getCase: jest.fn(),
      updateCase: jest.fn(),
      deleteCase: jest.fn(),
      updateTodo: jest.fn(),
      createIntervention: jest.fn(),
      listInterventions: jest.fn(),
      getIntervention: jest.fn(),
      updateIntervention: jest.fn(),
      deleteIntervention: jest.fn(),
      getDashboard: jest.fn(),
      getDashboardTodoCases: jest.fn(),
      addCaseHistory: jest.fn(),
      listCaseHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasesController],
      providers: [
        {
          provide: AbstractCasesService,
          useValue: mockCasesService,
        },
      ],
    }).compile();

    controller = module.get<CasesController>(CasesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTemplate", () => {
    it("should call casesService.createTemplate with body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Template 1",
        description: "Desc",
        steps: [],
      };
      mockCasesService.createTemplate.mockResolvedValue({ id: "tpl-1", ...body } as never);

      const result = await controller.createTemplate(body);

      expect(mockCasesService.createTemplate).toHaveBeenCalledWith(body);
      expect(result.id).toBe("tpl-1");
    });
  });

  describe("listTemplates", () => {
    it("should call casesService.listTemplates with organizationId", async () => {
      mockCasesService.listTemplates.mockResolvedValue([{ id: "tpl-1" }] as never);

      const result = await controller.listTemplates("org-1");

      expect(mockCasesService.listTemplates).toHaveBeenCalledWith("org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listTemplates(undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCasesService.listTemplates).not.toHaveBeenCalled();
    });
  });

  describe("createCase", () => {
    it("should call casesService.createCase with body", async () => {
      const body = {
        organizationId: "org-1",
        title: "Case 1",
        description: "Desc",
      };
      mockCasesService.createCase.mockResolvedValue({ id: "case-1", ...body } as never);

      const result = await controller.createCase(body);

      expect(mockCasesService.createCase).toHaveBeenCalledWith(body);
      expect(result.id).toBe("case-1");
    });
  });

  describe("listCases", () => {
    it("should call casesService.listCases with organizationId and filters", async () => {
      mockCasesService.listCases.mockResolvedValue([{ id: "case-1" }] as never);

      const result = await controller.listCases("org-1", "draft", "user-1", "high", "search");

      expect(mockCasesService.listCases).toHaveBeenCalledWith("org-1", {
        status: "draft",
        assigneeId: "user-1",
        priority: "high",
        search: "search",
      });
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.listCases(undefined as never, undefined, undefined, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
      expect(mockCasesService.listCases).not.toHaveBeenCalled();
    });
  });

  describe("getCase", () => {
    it("should call casesService.getCase with id and organizationId", async () => {
      mockCasesService.getCase.mockResolvedValue({ id: "case-1" } as never);

      const result = await controller.getCase("case-1", "org-1");

      expect(mockCasesService.getCase).toHaveBeenCalledWith("case-1", "org-1");
      expect(result.id).toBe("case-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getCase("case-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCasesService.getCase).not.toHaveBeenCalled();
    });
  });

  describe("deleteCase", () => {
    it("should call casesService.deleteCase with id and organizationId", async () => {
      mockCasesService.deleteCase.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteCase("case-1", "org-1");

      expect(mockCasesService.deleteCase).toHaveBeenCalledWith("case-1", "org-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("createIntervention", () => {
    it("should call casesService.createIntervention with body", async () => {
      const body = {
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention 1",
        description: "Desc",
      };
      mockCasesService.createIntervention.mockResolvedValue({ id: "int-1", ...body } as never);

      const result = await controller.createIntervention(body);

      expect(mockCasesService.createIntervention).toHaveBeenCalledWith(body);
      expect(result.id).toBe("int-1");
    });
  });

  describe("addCaseHistory", () => {
    it("should call casesService.addCaseHistory with body", async () => {
      const body = {
        organizationId: "org-1",
        caseId: "case-1",
        actorId: "user-1",
        actorName: "User One",
        action: "case_created" as const,
        details: "Case 1",
      };
      mockCasesService.addCaseHistory.mockResolvedValue({
        id: "hist-1",
        ...body,
        changes: [],
        createdAt: "2025-06-01T00:00:00.000Z",
      } as never);

      const result = await controller.addCaseHistory(body);

      expect(mockCasesService.addCaseHistory).toHaveBeenCalledWith(body);
      expect(result.id).toBe("hist-1");
    });
  });

  describe("listCaseHistory", () => {
    it("should call casesService.listCaseHistory with id and organizationId", async () => {
      const history = [
        {
          id: "hist-1",
          action: "case_created",
          actorName: "User One",
          createdAt: "2025-06-01T00:00:00.000Z",
        },
      ];
      mockCasesService.listCaseHistory.mockResolvedValue(history as never);

      const result = await controller.listCaseHistory("case-1", "org-1");

      expect(mockCasesService.listCaseHistory).toHaveBeenCalledWith("case-1", "org-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listCaseHistory("case-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCasesService.listCaseHistory).not.toHaveBeenCalled();
    });
  });

  describe("getDashboard", () => {
    it("should call casesService.getDashboard with organizationId, userId and userRole", async () => {
      const dashboard = {
        assignedCases: [],
        upcomingInterventions: [],
        overdueCases: [],
        todoWidgets: [],
        stats: { totalAssigned: 0, inProgress: 0, completedThisWeek: 0, overdue: 0 },
      };
      mockCasesService.getDashboard.mockResolvedValue(dashboard as never);

      const result = await controller.getDashboard("org-1", "user-1", "admin");

      expect(mockCasesService.getDashboard).toHaveBeenCalledWith("org-1", "user-1", "admin");
      expect(result).toEqual(dashboard);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.getDashboard(undefined as never, "user-1", undefined),
      ).rejects.toThrow(BadRequestException);
      expect(mockCasesService.getDashboard).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when userId is missing", async () => {
      await expect(controller.getDashboard("org-1", undefined as never, undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCasesService.getDashboard).not.toHaveBeenCalled();
    });
  });

  describe("getDashboardTodoCases", () => {
    it("should call casesService.getDashboardTodoCases with all params", async () => {
      mockCasesService.getDashboardTodoCases.mockResolvedValue([]);

      const result = await controller.getDashboardTodoCases(
        "org-1",
        "user-1",
        "admin",
        "tpl-1",
        "My Todo",
      );

      expect(mockCasesService.getDashboardTodoCases).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "admin",
        "tpl-1",
        "My Todo",
      );
      expect(result).toEqual([]);
    });

    it("should throw BadRequestException when templateId is missing", async () => {
      await expect(
        controller.getDashboardTodoCases("org-1", "user-1", "admin", undefined as never, "My Todo"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when todoLabel is missing", async () => {
      await expect(
        controller.getDashboardTodoCases("org-1", "user-1", "admin", "tpl-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
