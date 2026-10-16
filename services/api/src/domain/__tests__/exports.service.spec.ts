import { BadRequestException } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { ExportsGatewayService } from "../exports.service";
import type { ExportsService } from "../exports/exports.service";
import type { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";

describe("ExportsGatewayService", () => {
  const exportsService = {
    exportCaseSummaryPdf: jest.fn(),
    exportCasesList: jest.fn(),
    getReportingStats: jest.fn(),
    exportDashboardTodoCases: jest.fn(),
    previewReport: jest.fn(),
  };
  const permissions = {
    getUserAssignment: jest.fn(),
  };

  const user: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  const service = new ExportsGatewayService(
    exportsService as unknown as ExportsService,
    permissions as unknown as AbstractPermissionsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates a case PDF export to the domain service", async () => {
    const result = {
      buffer: Buffer.from("pdf"),
      contentType: "application/pdf",
      filename: "dossier-test.pdf",
    };
    exportsService.exportCaseSummaryPdf.mockResolvedValue(result);

    await expect(service.exportCaseSummaryPdf(user, "case-1")).resolves.toBe(result);
    expect(exportsService.exportCaseSummaryPdf).toHaveBeenCalledWith("org-123", "case-1");
  });

  it("delegates a cases list export with filters", async () => {
    exportsService.exportCasesList.mockResolvedValue({
      buffer: Buffer.from("xlsx"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "liste-dossiers.xlsx",
    });

    const result = await service.exportCasesList(user, "xlsx", {
      status: "open",
      billingStatus: "to_invoice",
    });

    expect(result.filename).toBe("liste-dossiers.xlsx");
    expect(exportsService.exportCasesList).toHaveBeenCalledWith("org-123", "xlsx", {
      status: "open",
      billingStatus: "to_invoice",
    });
  });

  it("delegates reporting stats", async () => {
    const stats = { casesTotal: 50 };
    exportsService.getReportingStats.mockResolvedValue(stats);

    await expect(
      service.getReportingStats(user, { startDate: "2024-01-01", endDate: "2024-01-31" }),
    ).resolves.toBe(stats);
    expect(exportsService.getReportingStats).toHaveBeenCalledWith("org-123", {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });
  });

  it("passes the user permission profile when exporting dashboard todos", async () => {
    permissions.getUserAssignment.mockResolvedValue({ profileId: "profile-1" });
    exportsService.exportDashboardTodoCases.mockResolvedValue({
      buffer: Buffer.from("csv"),
      contentType: "text/csv",
      filename: "taches.csv",
    });

    await service.exportDashboardTodoCases(user, "csv", {
      templateId: "tpl-1",
      todoLabel: "Vérifier",
    });

    expect(exportsService.exportDashboardTodoCases).toHaveBeenCalledWith("org-123", "csv", {
      userId: "user-123",
      userProfileId: "profile-1",
      templateId: "tpl-1",
      todoLabel: "Vérifier",
    });
  });

  it("rejects an unknown report type", async () => {
    await expect(service.previewReport(user, "nope")).rejects.toBeInstanceOf(BadRequestException);
    expect(exportsService.previewReport).not.toHaveBeenCalled();
  });
});
