import { ExportsGatewayService } from "../exports.service";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser } from "@planwise/shared";

describe("ExportsGatewayService (proxy)", () => {
  let service: ExportsGatewayService;
  let mockHttpService: jest.Mocked<HttpService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(() => {
    mockHttpService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    service = new ExportsGatewayService(mockHttpService);
  });

  describe("exportCaseSummaryPdf", () => {
    it("should proxy request to exports-service and return ExportResult", async () => {
      const pdfBuffer = Buffer.from("fake-pdf-content");
      mockHttpService.get.mockReturnValue(
        of({
          data: pdfBuffer,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'attachment; filename="dossier-test.pdf"',
          },
          status: 200,
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportCaseSummaryPdf(mockUser, "case-1");

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/exports/cases/case-1/pdf"),
        expect.objectContaining({
          params: { organizationId: "org-123" },
          responseType: "arraybuffer",
        }),
      );
      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toBe("dossier-test.pdf");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe("exportCasesList", () => {
    it("should proxy with format and filters", async () => {
      const xlsxBuffer = Buffer.from("fake-xlsx-content");
      mockHttpService.get.mockReturnValue(
        of({
          data: xlsxBuffer,
          headers: {
            "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "content-disposition": 'attachment; filename="liste-dossiers.xlsx"',
          },
          status: 200,
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportCasesList(mockUser, "xlsx", { status: "open" });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/exports/cases"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            format: "xlsx",
            status: "open",
          }),
        }),
      );
      expect(result.filename).toBe("liste-dossiers.xlsx");
    });
  });

  describe("getReportingStats", () => {
    it("should proxy reporting stats request", async () => {
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
      };
      mockHttpService.get.mockReturnValue(
        of({
          data: stats,
          headers: {},
          status: 200,
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.getReportingStats(mockUser);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/exports/reporting/stats"),
        expect.objectContaining({
          params: { organizationId: "org-123" },
        }),
      );
      expect(result).toEqual(stats);
    });
  });
});
