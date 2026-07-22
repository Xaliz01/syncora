import { Test, TestingModule } from "@nestjs/testing";
import { ExportsController } from "../exports.controller";
import { AbstractExportsGatewayService } from "../../../domain/ports/exports.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@planwise/shared";

describe("ExportsController", () => {
  let controller: ExportsController;
  let mockExportsService: jest.Mocked<AbstractExportsGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  const mockResponse = () => {
    const res: Record<string, jest.Mock> = {};
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res as unknown as import("express").Response;
  };

  beforeEach(async () => {
    mockExportsService = {
      exportCaseSummaryPdf: jest.fn(),
      exportCasesList: jest.fn(),
      exportUsersList: jest.fn(),
      exportCustomersList: jest.fn(),
      exportInterventionsList: jest.fn(),
      exportTechniciansActivity: jest.fn(),
      exportMileageReport: jest.fn(),
      exportDashboardTodoCases: jest.fn(),
      exportInvoicesList: jest.fn(),
      getReportingStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportsController],
      providers: [
        {
          provide: AbstractExportsGatewayService,
          useValue: mockExportsService,
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

    controller = module.get<ExportsController>(ExportsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("exportCaseSummary", () => {
    it("should call exportCaseSummaryPdf and send response", async () => {
      const exportResult = {
        buffer: Buffer.from("pdf-content"),
        contentType: "application/pdf",
        filename: "dossier-test.pdf",
      };
      mockExportsService.exportCaseSummaryPdf.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportCaseSummary(mockUser, "case-1", res);

      expect(mockExportsService.exportCaseSummaryPdf).toHaveBeenCalledWith(mockUser, "case-1");
      expect(res.set).toHaveBeenCalledWith({
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="dossier-test.pdf"',
        "Content-Length": exportResult.buffer.length.toString(),
      });
      expect(res.send).toHaveBeenCalledWith(exportResult.buffer);
    });
  });

  describe("exportCasesList", () => {
    it("should call exportCasesList with xlsx format and filters", async () => {
      const exportResult = {
        buffer: Buffer.from("xlsx-content"),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "liste-dossiers.xlsx",
      };
      mockExportsService.exportCasesList.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportCasesList(
        mockUser,
        "xlsx",
        "in_progress",
        "to_invoice",
        "high",
        undefined,
        undefined,
        undefined,
        undefined,
        res,
      );

      expect(mockExportsService.exportCasesList).toHaveBeenCalledWith(mockUser, "xlsx", {
        status: "in_progress",
        billingStatus: "to_invoice",
        priority: "high",
        assigneeId: undefined,
        search: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      expect(res.send).toHaveBeenCalledWith(exportResult.buffer);
    });

    it("should accept csv format", async () => {
      const exportResult = {
        buffer: Buffer.from("csv-content"),
        contentType: "text/csv; charset=utf-8",
        filename: "liste-dossiers.csv",
      };
      mockExportsService.exportCasesList.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportCasesList(
        mockUser,
        "csv",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        res,
      );

      expect(mockExportsService.exportCasesList).toHaveBeenCalledWith(mockUser, "csv", {
        status: undefined,
        billingStatus: undefined,
        priority: undefined,
        assigneeId: undefined,
        search: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      expect(res.send).toHaveBeenCalledWith(exportResult.buffer);
    });

    it("should reject invalid format", async () => {
      const res = mockResponse();

      await expect(
        controller.exportCasesList(
          mockUser,
          "docx",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          res,
        ),
      ).rejects.toThrow("Format invalide");
    });
  });

  describe("exportUsersList", () => {
    it("should call exportUsersList with pdf format", async () => {
      const exportResult = {
        buffer: Buffer.from("pdf-users"),
        contentType: "application/pdf",
        filename: "liste-utilisateurs.pdf",
      };
      mockExportsService.exportUsersList.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportUsersList(mockUser, "pdf", res);

      expect(mockExportsService.exportUsersList).toHaveBeenCalledWith(mockUser, "pdf");
      expect(res.send).toHaveBeenCalledWith(exportResult.buffer);
    });
  });

  describe("exportInterventionsList", () => {
    it("should call exportInterventionsList with filters", async () => {
      const exportResult = {
        buffer: Buffer.from("xlsx-interventions"),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "liste-interventions.xlsx",
      };
      mockExportsService.exportInterventionsList.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportInterventionsList(
        mockUser,
        "xlsx",
        "2024-01-01",
        "2024-12-31",
        "user-1",
        "team-1",
        "completed",
        res,
      );

      expect(mockExportsService.exportInterventionsList).toHaveBeenCalledWith(mockUser, "xlsx", {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        assigneeId: "user-1",
        teamId: "team-1",
        status: "completed",
      });
    });
  });

  describe("exportDashboardTodoCases", () => {
    it("should require templateId and todoLabel", async () => {
      const res = mockResponse();

      await expect(
        controller.exportDashboardTodoCases(mockUser, "xlsx", undefined, undefined, res),
      ).rejects.toThrow("templateId et todoLabel sont requis");
    });

    it("should call exportDashboardTodoCases with params", async () => {
      const exportResult = {
        buffer: Buffer.from("xlsx-todos"),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "taches-dossiers.xlsx",
      };
      mockExportsService.exportDashboardTodoCases.mockResolvedValue(exportResult);
      const res = mockResponse();

      await controller.exportDashboardTodoCases(
        mockUser,
        "xlsx",
        "template-1",
        "Vérifier le devis",
        res,
      );

      expect(mockExportsService.exportDashboardTodoCases).toHaveBeenCalledWith(mockUser, "xlsx", {
        templateId: "template-1",
        todoLabel: "Vérifier le devis",
      });
    });
  });

  describe("getReportingStats", () => {
    it("should return reporting stats", async () => {
      const stats = {
        casesTotal: 50,
        casesCompleted: 20,
        casesInProgress: 15,
        casesOverdue: 5,
        interventionsTotal: 100,
        interventionsCompleted: 60,
        avgCompletionDays: 3.2,
        techniciansActive: 8,
        customersTotal: 30,
        casesBillingToInvoice: 4,
        casesBillingDraft: 2,
        casesBillingPartiallyInvoiced: 3,
        casesBillingInvoiced: 5,
        casesBillingPaid: 6,
      };
      mockExportsService.getReportingStats.mockResolvedValue(stats);

      const result = await controller.getReportingStats(mockUser, "2024-01-01", "2024-01-31");

      expect(mockExportsService.getReportingStats).toHaveBeenCalledWith(mockUser, {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });
      expect(result).toEqual(stats);
    });
  });
});
