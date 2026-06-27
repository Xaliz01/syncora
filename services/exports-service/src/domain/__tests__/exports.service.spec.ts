import { ExportsService } from "../exports.service";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { CaseResponse, CaseSummaryResponse, InterventionResponse } from "@syncora/shared";

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

  describe("getReportingStats", () => {
    it("should aggregate stats from multiple services", async () => {
      const cases: CaseSummaryResponse[] = [
        {
          id: "c1",
          organizationId: "org-123",
          title: "Case 1",
          status: "completed",
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
