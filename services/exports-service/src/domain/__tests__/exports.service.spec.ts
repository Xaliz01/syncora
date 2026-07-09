import { ExportsService } from "../exports.service";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import ExcelJS from "exceljs";
import type {
  CaseResponse,
  CaseSummaryResponse,
  DashboardTodoCaseItem,
  InterventionResponse,
} from "@planwise/shared";

describe("ExportsService", () => {
  let service: ExportsService;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    mockHttpService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    service = new ExportsService(mockHttpService);
  });

  describe("exportCaseSummaryPdf", () => {
    it("should generate a PDF buffer for a case", async () => {
      const caseData: CaseResponse = {
        id: "case-1",
        organizationId: "org-123",
        title: "Dossier Test",
        status: "in_progress",
        billingStatus: "none",
        priority: "high",
        assignees: [{ userId: "u1", name: "Jean Dupont" }],
        tags: [],
        steps: [
          {
            id: "step-1",
            name: "Préparation",
            order: 1,
            todos: [{ id: "t1", label: "Vérifier", status: "done" }],
          },
        ],
        progress: 50,
        interventionCount: 2,
        createdAt: "2024-01-15T10:00:00Z",
      };

      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          title: "Intervention 1",
          status: "completed",
          billingStatus: "none",
          createdAt: "2024-01-16T10:00:00Z",
        },
      ];

      mockHttpService.get
        .mockReturnValueOnce(
          of({
            data: caseData,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: interventions,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.exportCaseSummaryPdf("org-123", "case-1");

      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toMatch(/\.pdf$/);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("exportCasesList", () => {
    it("should generate an XLSX buffer for cases list", async () => {
      const cases: CaseSummaryResponse[] = [
        {
          id: "case-1",
          organizationId: "org-123",
          title: "Dossier A",
          status: "open",
          billingStatus: "none",
          priority: "medium",
          assignees: [],
          tags: [],
          progress: 25,
          interventionCount: 1,
          createdAt: "2024-01-10T08:00:00Z",
        },
      ];

      mockHttpService.get.mockReturnValue(
        of({
          data: cases,
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportCasesList("org-123", "xlsx", { status: "open" });

      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("liste-dossiers.xlsx");
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("should forward billingStatus filter to cases-service", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: [], status: 200, headers: {}, statusText: "OK", config: {} as never }) as never,
      );

      await service.exportCasesList("org-123", "xlsx", { billingStatus: "to_invoice" });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/cases"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            billingStatus: "to_invoice",
          }),
        }),
      );
    });

    it("should generate a PDF buffer for cases list", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: [], status: 200, headers: {}, statusText: "OK", config: {} as never }) as never,
      );

      const result = await service.exportCasesList("org-123", "pdf");

      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toBe("liste-dossiers.pdf");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });

  describe("exportUsersList", () => {
    it("should generate an XLSX buffer for users list", async () => {
      const users = [
        {
          id: "u1",
          organizationId: "org-123",
          email: "alice@example.com",
          name: "Alice",
          role: "admin",
          status: "active",
        },
      ];

      mockHttpService.get.mockReturnValue(
        of({
          data: users,
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportUsersList("org-123", "xlsx");

      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("liste-utilisateurs.xlsx");
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("exportDashboardTodoCases", () => {
    it("should call the cases dashboard endpoint with userId and forward the todo params", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: [], status: 200, headers: {}, statusText: "OK", config: {} as never }) as never,
      );

      const result = await service.exportDashboardTodoCases("org-123", "xlsx", {
        userId: "user-1",
        userProfileId: "profile-1",
        templateId: "template-1",
        todoLabel: "Vérifier le devis",
      });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/todo-cases"),
        {
          params: {
            organizationId: "org-123",
            userId: "user-1",
            userProfileId: "profile-1",
            templateId: "template-1",
            todoLabel: "Vérifier le devis",
          },
        },
      );
      const calledUrl = mockHttpService.get.mock.calls[0]?.[0] as string;
      expect(calledUrl).not.toContain("/cases/dashboard/todo-cases");
      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("taches-dossiers.xlsx");
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should place data directly under the styled header (no empty spacer row)", async () => {
      const cases: DashboardTodoCaseItem[] = [
        {
          caseId: "case-1",
          caseTitle: "Dossier A",
          customerName: "Client A",
          status: "in_progress",
          priority: "high",
          createdAt: "2024-01-10T08:00:00Z",
          dueDate: "2024-02-01T08:00:00Z",
        },
      ];
      mockHttpService.get.mockReturnValue(
        of({
          data: cases,
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportDashboardTodoCases("org-123", "xlsx", {
        userId: "user-1",
        templateId: "template-1",
        todoLabel: "Vérifier le devis",
      });

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(result.buffer as unknown as ArrayBuffer);
      const ws = wb.getWorksheet("Dossiers")!;

      const headerRowNumber = 3;
      const headerRow = ws.getRow(headerRowNumber);
      expect(headerRow.getCell(1).value).toBe("Dossier");
      expect(headerRow.font?.bold).toBe(true);

      const firstDataRow = ws.getRow(headerRowNumber + 1);
      expect(firstDataRow.getCell(1).value).toBe("Dossier A");
    });
  });

  describe("getReportingStats", () => {
    it("should aggregate stats from multiple services", async () => {
      const cases: CaseSummaryResponse[] = [
        {
          id: "c1",
          organizationId: "org-123",
          title: "Case 1",
          status: "completed",
          billingStatus: "none",
          priority: "medium",
          assignees: [],
          tags: [],
          progress: 100,
          interventionCount: 1,
        },
        {
          id: "c2",
          organizationId: "org-123",
          title: "Case 2",
          status: "in_progress",
          billingStatus: "none",
          priority: "high",
          assignees: [],
          tags: [],
          progress: 50,
          interventionCount: 2,
          dueDate: "2020-01-01T00:00:00Z",
        },
      ];

      const interventions: InterventionResponse[] = [
        {
          id: "i1",
          organizationId: "org-123",
          caseId: "c1",
          title: "Int 1",
          status: "completed",
          billingStatus: "none",
          startedAt: "2024-01-01T08:00:00Z",
          completedAt: "2024-01-01T10:00:00Z",
        },
      ];

      const technicians = [
        { id: "t1", organizationId: "org-123", firstName: "A", lastName: "B", status: "actif" },
      ];

      const customers = [{ id: "cust-1", organizationId: "org-123", displayName: "Client A" }];

      mockHttpService.get
        .mockReturnValueOnce(
          of({
            data: cases,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: interventions,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: technicians,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: customers,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.getReportingStats("org-123");

      expect(result.casesTotal).toBe(2);
      expect(result.casesCompleted).toBe(1);
      expect(result.casesInProgress).toBe(1);
      expect(result.casesOverdue).toBe(1);
      expect(result.interventionsTotal).toBe(1);
      expect(result.interventionsCompleted).toBe(1);
      expect(result.techniciansActive).toBe(1);
      expect(result.customersTotal).toBe(1);
    });
  });
});
