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
      startIntervention: jest.fn(),
      completeIntervention: jest.fn(),
      signIntervention: jest.fn(),
      getInterventionWithSignature: jest.fn(),
      getDashboard: jest.fn(),
      getDashboardTodoCases: jest.fn(),
      getDashboardStatCases: jest.fn(),
      listUpcomingInterventions: jest.fn(),
      addCaseHistory: jest.fn(),
      listCaseHistory: jest.fn(),
      createQuote: jest.fn(),
      listQuotes: jest.fn(),
      getQuote: jest.fn(),
      updateQuote: jest.fn(),
      deleteQuote: jest.fn(),
      createComment: jest.fn(),
      listComments: jest.fn(),
      getComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
      purgeTestData: jest.fn(),
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
      mockCasesService.listCases.mockResolvedValue({
        cases: [{ id: "case-1" }],
        total: 1,
      } as never);

      const result = await controller.listCases(
        "org-1",
        "draft",
        undefined,
        "user-1",
        "high",
        "search",
        undefined,
        undefined,
        undefined,
      );

      expect(mockCasesService.listCases).toHaveBeenCalledWith("org-1", {
        status: "draft",
        billingStatus: undefined,
        assigneeId: "user-1",
        priority: "high",
        search: "search",
        customerId: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result.cases).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.listCases(
          undefined as never,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
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
    it("should call casesService.getDashboard with organizationId, userId and userProfileId", async () => {
      const dashboard = {
        assignedCases: [],
        upcomingInterventions: [],
        overdueCases: [],
        todoWidgets: [],
        stats: { totalAssigned: 0, inProgress: 0, completedThisWeek: 0, overdue: 0 },
      };
      mockCasesService.getDashboard.mockResolvedValue(dashboard as never);

      const result = await controller.getDashboard("org-1", "user-1", "profile-1");

      expect(mockCasesService.getDashboard).toHaveBeenCalledWith("org-1", "user-1", "profile-1");
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
        "profile-1",
        "tpl-1",
        "My Todo",
      );

      expect(mockCasesService.getDashboardTodoCases).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "profile-1",
        "tpl-1",
        "My Todo",
      );
      expect(result).toEqual([]);
    });

    it("should throw BadRequestException when templateId is missing", async () => {
      await expect(
        controller.getDashboardTodoCases(
          "org-1",
          "user-1",
          "profile-1",
          undefined as never,
          "My Todo",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when todoLabel is missing", async () => {
      await expect(
        controller.getDashboardTodoCases(
          "org-1",
          "user-1",
          "profile-1",
          "tpl-1",
          undefined as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getDashboardStatCases", () => {
    it("should call casesService.getDashboardStatCases with filter", async () => {
      mockCasesService.getDashboardStatCases.mockResolvedValue([]);

      const result = await controller.getDashboardStatCases(
        "org-1",
        "user-1",
        "profile-1",
        "in_progress",
      );

      expect(mockCasesService.getDashboardStatCases).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "profile-1",
        "in_progress",
      );
      expect(result).toEqual([]);
    });

    it("should throw BadRequestException for invalid filter", async () => {
      await expect(
        controller.getDashboardStatCases("org-1", "user-1", undefined, "invalid"),
      ).rejects.toThrow(BadRequestException);
      expect(mockCasesService.getDashboardStatCases).not.toHaveBeenCalled();
    });
  });

  describe("comments", () => {
    it("should create a comment", async () => {
      const body = {
        organizationId: "org-1",
        entityType: "case" as const,
        entityId: "case-1",
        body: "Hello",
        authorId: "user-1",
        authorName: "Alice",
      };
      mockCasesService.createComment.mockResolvedValue({ id: "c-1", ...body } as never);

      const result = await controller.createComment(body);

      expect(mockCasesService.createComment).toHaveBeenCalledWith(body);
      expect(result).toEqual(expect.objectContaining({ id: "c-1" }));
    });

    it("should list comments", async () => {
      mockCasesService.listComments.mockResolvedValue([{ id: "c-1" }] as never);

      const result = await controller.listComments("org-1", "case", "case-1");

      expect(mockCasesService.listComments).toHaveBeenCalledWith("org-1", "case", "case-1");
      expect(result).toHaveLength(1);
    });

    it("should require entityType and entityId when listing", async () => {
      await expect(controller.listComments("org-1", "", "")).rejects.toThrow(BadRequestException);
    });

    it("should delete a comment", async () => {
      mockCasesService.deleteComment.mockResolvedValue({ deleted: true });

      const result = await controller.deleteComment("c-1", "org-1");

      expect(mockCasesService.deleteComment).toHaveBeenCalledWith("c-1", "org-1");
      expect(result).toEqual({ deleted: true });
    });
  });
});
