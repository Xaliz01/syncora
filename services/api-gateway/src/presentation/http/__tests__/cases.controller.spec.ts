import { Test, TestingModule } from "@nestjs/testing";
import { CasesController } from "../cases.controller";
import { AbstractCasesGatewayService } from "../../../domain/ports/cases.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

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
      getDashboard: jest.fn(),
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
    it("should call casesService.listCases with user and filters", async () => {
      mockCasesService.listCases.mockResolvedValue([{ id: "case-1" }] as never);

      const result = await controller.listCases(
        mockUser,
        "open",
        "assignee-1",
        "high",
        "search-term",
      );

      expect(mockCasesService.listCases).toHaveBeenCalledWith(mockUser, {
        status: "open",
        assigneeId: "assignee-1",
        priority: "high",
        search: "search-term",
      });
      expect(result).toEqual([{ id: "case-1" }]);
    });

    it("should call casesService.listCases with undefined filters", async () => {
      mockCasesService.listCases.mockResolvedValue([] as never);

      const result = await controller.listCases(mockUser);

      expect(mockCasesService.listCases).toHaveBeenCalledWith(mockUser, {
        status: undefined,
        assigneeId: undefined,
        priority: undefined,
        search: undefined,
      });
      expect(result).toEqual([]);
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
    it("should call casesService.listInterventions with user and filters", async () => {
      mockCasesService.listInterventions.mockResolvedValue([{ id: "int-1" }] as never);

      const result = await controller.listInterventions(
        mockUser,
        "case-1",
        "assignee-1",
        "2025-01-01",
        "2025-12-31",
        "scheduled",
        "false",
      );

      expect(mockCasesService.listInterventions).toHaveBeenCalledWith(mockUser, {
        caseId: "case-1",
        assigneeId: "assignee-1",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        status: "scheduled",
        unscheduled: "false",
      });
      expect(result).toEqual([{ id: "int-1" }]);
    });

    it("should call casesService.listInterventions with undefined filters", async () => {
      mockCasesService.listInterventions.mockResolvedValue([] as never);

      const result = await controller.listInterventions(mockUser);

      expect(mockCasesService.listInterventions).toHaveBeenCalledWith(mockUser, {
        caseId: undefined,
        assigneeId: undefined,
        startDate: undefined,
        endDate: undefined,
        status: undefined,
        unscheduled: undefined,
      });
      expect(result).toEqual([]);
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
});
