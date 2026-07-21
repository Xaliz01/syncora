import { Test, TestingModule } from "@nestjs/testing";
import { CasesController } from "../cases.controller";
import { AbstractCasesGatewayService } from "../../../domain/ports/cases.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@planwise/shared";

describe("CasesController", () => {
  let controller: CasesController;
  let mockCasesService: jest.Mocked<AbstractCasesGatewayService>;

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
      generateInterventionReport: jest.fn(),
      getDashboard: jest.fn(),
      getDashboardTodoCases: jest.fn(),
      getDashboardStatCases: jest.fn(),
      listCaseHistory: jest.fn(),
      createQuote: jest.fn(),
      listQuotes: jest.fn(),
      getQuote: jest.fn(),
      updateQuote: jest.fn(),
      deleteQuote: jest.fn(),
      generateQuotePdf: jest.fn(),
      previewQuotePdf: jest.fn(),
      createComment: jest.fn(),
      listComments: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasesController],
      providers: [
        {
          provide: AbstractCasesGatewayService,
          useValue: mockCasesService,
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

    controller = module.get<CasesController>(CasesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createTemplate", () => {
    it("should call casesService.createTemplate with user and body", async () => {
      const body = { name: "Template A", steps: [] };
      mockCasesService.createTemplate.mockResolvedValue({
        id: "tpl-1",
        name: "Template A",
      } as never);

      const result = await controller.createTemplate(mockUser, body);

      expect(mockCasesService.createTemplate).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "tpl-1", name: "Template A" });
    });
  });

  describe("listTemplates", () => {
    it("should call casesService.listTemplates with user", async () => {
      mockCasesService.listTemplates.mockResolvedValue([{ id: "tpl-1" }] as never);

      const result = await controller.listTemplates(mockUser);

      expect(mockCasesService.listTemplates).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "tpl-1" }]);
    });
  });

  describe("getTemplate", () => {
    it("should call casesService.getTemplate with user and templateId", async () => {
      mockCasesService.getTemplate.mockResolvedValue({ id: "tpl-1" } as never);

      const result = await controller.getTemplate(mockUser, "tpl-1");

      expect(mockCasesService.getTemplate).toHaveBeenCalledWith(mockUser, "tpl-1");
      expect(result).toEqual({ id: "tpl-1" });
    });
  });

  describe("updateTemplate", () => {
    it("should call casesService.updateTemplate with user, templateId and body", async () => {
      const body = { name: "Updated Template" };
      mockCasesService.updateTemplate.mockResolvedValue({
        id: "tpl-1",
        name: "Updated Template",
      } as never);

      const result = await controller.updateTemplate(mockUser, "tpl-1", body);

      expect(mockCasesService.updateTemplate).toHaveBeenCalledWith(mockUser, "tpl-1", body);
      expect(result).toEqual({ id: "tpl-1", name: "Updated Template" });
    });
  });

  describe("deleteTemplate", () => {
    it("should call casesService.deleteTemplate with user and templateId", async () => {
      mockCasesService.deleteTemplate.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteTemplate(mockUser, "tpl-1");

      expect(mockCasesService.deleteTemplate).toHaveBeenCalledWith(mockUser, "tpl-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("createCase", () => {
    it("should call casesService.createCase with user and body", async () => {
      const body = { title: "Case A" };
      mockCasesService.createCase.mockResolvedValue({ id: "case-1", title: "Case A" } as never);

      const result = await controller.createCase(mockUser, body);

      expect(mockCasesService.createCase).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "case-1", title: "Case A" });
    });
  });

  describe("listCases", () => {
    it("should call casesService.listCases with user, filters and pagination", async () => {
      mockCasesService.listCases.mockResolvedValue({
        cases: [{ id: "case-1" }],
        total: 1,
      } as never);

      const result = await controller.listCases(
        mockUser,
        "open",
        undefined,
        "assignee-1",
        "high",
        "search-term",
        undefined,
        "25",
        "10",
      );

      expect(mockCasesService.listCases).toHaveBeenCalledWith(mockUser, {
        status: "open",
        billingStatus: undefined,
        assigneeId: "assignee-1",
        priority: "high",
        search: "search-term",
        customerId: undefined,
        limit: 25,
        offset: 10,
      });
      expect(result).toEqual({ cases: [{ id: "case-1" }], total: 1 });
    });

    it("should call casesService.listCases with default pagination", async () => {
      mockCasesService.listCases.mockResolvedValue({ cases: [], total: 0 } as never);

      const result = await controller.listCases(mockUser);

      expect(mockCasesService.listCases).toHaveBeenCalledWith(mockUser, {
        status: undefined,
        billingStatus: undefined,
        assigneeId: undefined,
        priority: undefined,
        search: undefined,
        customerId: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result).toEqual({ cases: [], total: 0 });
    });
  });

  describe("getCase", () => {
    it("should call casesService.getCase with user and caseId", async () => {
      mockCasesService.getCase.mockResolvedValue({ id: "case-1" } as never);

      const result = await controller.getCase(mockUser, "case-1");

      expect(mockCasesService.getCase).toHaveBeenCalledWith(mockUser, "case-1");
      expect(result).toEqual({ id: "case-1" });
    });
  });

  describe("updateCase", () => {
    it("should call casesService.updateCase with user, caseId and body", async () => {
      const body = { title: "Updated Case" };
      mockCasesService.updateCase.mockResolvedValue({
        id: "case-1",
        title: "Updated Case",
      } as never);

      const result = await controller.updateCase(mockUser, "case-1", body);

      expect(mockCasesService.updateCase).toHaveBeenCalledWith(mockUser, "case-1", body);
      expect(result).toEqual({ id: "case-1", title: "Updated Case" });
    });
  });

  describe("deleteCase", () => {
    it("should call casesService.deleteCase with user and caseId", async () => {
      mockCasesService.deleteCase.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteCase(mockUser, "case-1");

      expect(mockCasesService.deleteCase).toHaveBeenCalledWith(mockUser, "case-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("updateTodo", () => {
    it("should call casesService.updateTodo with user, caseId and body", async () => {
      const body = { stepId: "step-1", todoId: "todo-1", status: "done" };
      mockCasesService.updateTodo.mockResolvedValue({ id: "case-1" } as never);

      const result = await controller.updateTodo(mockUser, "case-1", body);

      expect(mockCasesService.updateTodo).toHaveBeenCalledWith(mockUser, "case-1", body);
      expect(result).toEqual({ id: "case-1" });
    });
  });

  describe("createIntervention", () => {
    it("should call casesService.createIntervention with user and body", async () => {
      const body = { caseId: "case-1", title: "Intervention A" };
      mockCasesService.createIntervention.mockResolvedValue({
        id: "int-1",
        title: "Intervention A",
      } as never);

      const result = await controller.createIntervention(mockUser, body);

      expect(mockCasesService.createIntervention).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "int-1", title: "Intervention A" });
    });
  });

  describe("listInterventions", () => {
    it("should call casesService.listInterventions with user, filters and pagination", async () => {
      mockCasesService.listInterventions.mockResolvedValue({
        interventions: [{ id: "int-1" }],
        total: 1,
      } as never);

      const result = await controller.listInterventions(
        mockUser,
        "case-1",
        "assignee-1",
        "2025-01-01",
        "2025-12-31",
        "scheduled",
        "false",
        undefined,
        "repair",
        "100",
        "0",
      );

      expect(mockCasesService.listInterventions).toHaveBeenCalledWith(mockUser, {
        caseId: "case-1",
        assigneeId: "assignee-1",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        status: "scheduled",
        unscheduled: "false",
        includeTeamAssignments: undefined,
        search: "repair",
        limit: 100,
        offset: 0,
      });
      expect(result).toEqual({ interventions: [{ id: "int-1" }], total: 1 });
    });

    it("should allow MAX_PAGE_LIMIT_WIDE when date range is set", async () => {
      mockCasesService.listInterventions.mockResolvedValue({
        interventions: [],
        total: 0,
      } as never);

      await controller.listInterventions(
        mockUser,
        undefined,
        undefined,
        "2025-01-01",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "500",
        "0",
      );

      expect(mockCasesService.listInterventions).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ limit: 500, offset: 0 }),
      );
    });

    it("should call casesService.listInterventions with default pagination", async () => {
      mockCasesService.listInterventions.mockResolvedValue({
        interventions: [],
        total: 0,
      } as never);

      const result = await controller.listInterventions(mockUser);

      expect(mockCasesService.listInterventions).toHaveBeenCalledWith(mockUser, {
        caseId: undefined,
        assigneeId: undefined,
        startDate: undefined,
        endDate: undefined,
        status: undefined,
        unscheduled: undefined,
        includeTeamAssignments: undefined,
        search: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result).toEqual({ interventions: [], total: 0 });
    });
  });

  describe("getIntervention", () => {
    it("should call casesService.getIntervention with user and interventionId", async () => {
      mockCasesService.getIntervention.mockResolvedValue({ id: "int-1" } as never);

      const result = await controller.getIntervention(mockUser, "int-1");

      expect(mockCasesService.getIntervention).toHaveBeenCalledWith(mockUser, "int-1");
      expect(result).toEqual({ id: "int-1" });
    });
  });

  describe("updateIntervention", () => {
    it("should call casesService.updateIntervention with user, interventionId and body", async () => {
      const body = { title: "Updated Intervention" };
      mockCasesService.updateIntervention.mockResolvedValue({
        id: "int-1",
        title: "Updated Intervention",
      } as never);

      const result = await controller.updateIntervention(mockUser, "int-1", body);

      expect(mockCasesService.updateIntervention).toHaveBeenCalledWith(mockUser, "int-1", body);
      expect(result).toEqual({ id: "int-1", title: "Updated Intervention" });
    });
  });

  describe("deleteIntervention", () => {
    it("should call casesService.deleteIntervention with user and interventionId", async () => {
      mockCasesService.deleteIntervention.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteIntervention(mockUser, "int-1");

      expect(mockCasesService.deleteIntervention).toHaveBeenCalledWith(mockUser, "int-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("getDashboard", () => {
    it("should call casesService.getDashboard with user", async () => {
      const dashboard = { totalCases: 5, openCases: 3 };
      mockCasesService.getDashboard.mockResolvedValue(dashboard as never);

      const result = await controller.getDashboard(mockUser);

      expect(mockCasesService.getDashboard).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(dashboard);
    });
  });

  describe("getDashboardTodoCases", () => {
    it("should call casesService.getDashboardTodoCases with user, templateId and todoLabel", async () => {
      mockCasesService.getDashboardTodoCases.mockResolvedValue([]);

      const result = await controller.getDashboardTodoCases(mockUser, "tpl-1", "My Todo");

      expect(mockCasesService.getDashboardTodoCases).toHaveBeenCalledWith(
        mockUser,
        "tpl-1",
        "My Todo",
      );
      expect(result).toEqual([]);
    });
  });

  describe("listCaseHistory", () => {
    it("should call casesService.listCaseHistory with user and caseId", async () => {
      const history = [
        {
          id: "hist-1",
          action: "case_created",
          actorName: "Admin User",
          createdAt: "2025-06-01T00:00:00.000Z",
        },
      ];
      mockCasesService.listCaseHistory.mockResolvedValue(history as never);

      const result = await controller.listCaseHistory(mockUser, "case-1");

      expect(mockCasesService.listCaseHistory).toHaveBeenCalledWith(mockUser, "case-1");
      expect(result).toEqual(history);
    });
  });

  describe("generateQuotePdf", () => {
    it("should call casesService.generateQuotePdf and set response headers", async () => {
      const pdfBuffer = Buffer.from("fake-pdf");
      mockCasesService.generateQuotePdf.mockResolvedValue(pdfBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.generateQuotePdf(mockUser, "quote-1", mockRes as never);

      expect(mockCasesService.generateQuotePdf).toHaveBeenCalledWith(mockUser, "quote-1");
      expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="devis-quote-1.pdf"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(pdfBuffer);
    });
  });

  describe("previewQuotePdf", () => {
    it("should call casesService.previewQuotePdf and set inline disposition", async () => {
      const pdfBuffer = Buffer.from("preview-pdf");
      mockCasesService.previewQuotePdf.mockResolvedValue(pdfBuffer);
      const body = {
        caseId: "case-1",
        lines: [{ description: "Ligne", quantity: 1, unitPrice: 10, tvaRate: 20 }],
      };
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      await controller.previewQuotePdf(mockUser, body, mockRes as never);

      expect(mockCasesService.previewQuotePdf).toHaveBeenCalledWith(mockUser, body);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'inline; filename="devis-apercu.pdf"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(pdfBuffer);
    });
  });

  describe("createQuote", () => {
    it("should call casesService.createQuote with user and body including articleId", async () => {
      const body = {
        caseId: "case-1",
        subject: "Installation plomberie",
        lines: [
          {
            articleId: "article-123",
            description: "Tuyau PVC",
            quantity: 5,
            unitPrice: 12.5,
            tvaRate: 20,
            unit: "mètre",
          },
          { description: "Main d'oeuvre", quantity: 2, unitPrice: 45, tvaRate: 20 },
        ],
      };
      mockCasesService.createQuote.mockResolvedValue({ id: "quote-1" } as never);

      const result = await controller.createQuote(mockUser, body);

      expect(mockCasesService.createQuote).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "quote-1" });
    });
  });

  describe("comments", () => {
    it("should create a comment", async () => {
      const body = { entityType: "case" as const, entityId: "case-1", body: "Hello" };
      mockCasesService.createComment.mockResolvedValue({ id: "c-1", ...body } as never);

      const result = await controller.createComment(mockUser, body);

      expect(mockCasesService.createComment).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual(expect.objectContaining({ id: "c-1" }));
    });

    it("should list comments", async () => {
      mockCasesService.listComments.mockResolvedValue([{ id: "c-1" }] as never);

      const result = await controller.listComments(mockUser, "intervention", "int-1");

      expect(mockCasesService.listComments).toHaveBeenCalledWith(mockUser, "intervention", "int-1");
      expect(result).toHaveLength(1);
    });

    it("should update a comment", async () => {
      mockCasesService.updateComment.mockResolvedValue({ id: "c-1", body: "Updated" } as never);

      const result = await controller.updateComment(mockUser, "c-1", { body: "Updated" });

      expect(mockCasesService.updateComment).toHaveBeenCalledWith(mockUser, "c-1", {
        body: "Updated",
      });
      expect(result).toEqual({ id: "c-1", body: "Updated" });
    });

    it("should delete a comment", async () => {
      mockCasesService.deleteComment.mockResolvedValue({ deleted: true });

      const result = await controller.deleteComment(mockUser, "c-1");

      expect(mockCasesService.deleteComment).toHaveBeenCalledWith(mockUser, "c-1");
      expect(result).toEqual({ deleted: true });
    });
  });
});
