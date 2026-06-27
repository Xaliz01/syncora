import { ExportsGatewayService } from "../exports.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import type {
  AuthUser,
  CaseResponse,
  CaseSummaryResponse,
  InterventionResponse,
} from "@syncora/shared";

describe("ExportsGatewayService", () => {
  let service: ExportsGatewayService;
  let mockScopedHttp: jest.Mocked<OrganizationScopedHttpClient>;

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
    mockScopedHttp = {
      request: jest.fn(),
    } as unknown as jest.Mocked<OrganizationScopedHttpClient>;

    service = new ExportsGatewayService(mockScopedHttp);
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

      mockScopedHttp.request.mockResolvedValueOnce(caseData).mockResolvedValueOnce(interventions);

      const result = await service.exportCaseSummaryPdf(mockUser, "case-1");

      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toContain("dossier-");
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
        {
          id: "case-2",
          organizationId: "org-123",
          title: "Dossier B",
          status: "completed",
          priority: "low",
          assignees: [],
          tags: [],
          progress: 100,
          interventionCount: 3,
          dueDate: "2024-02-01T00:00:00Z",
          createdAt: "2024-01-05T08:00:00Z",
        },
      ];

      mockScopedHttp.request.mockResolvedValueOnce(cases);

      const result = await service.exportCasesList(mockUser, "xlsx", { status: "open" });

      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("liste-dossiers.xlsx");
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it("should generate a PDF buffer for cases list", async () => {
      mockScopedHttp.request.mockResolvedValueOnce([]);

      const result = await service.exportCasesList(mockUser, "pdf");

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
        {
          id: "u2",
          organizationId: "org-123",
          email: "bob@example.com",
          name: "Bob",
          role: "member",
          status: "active",
        },
      ];

      mockScopedHttp.request.mockResolvedValueOnce(users);

      const result = await service.exportUsersList(mockUser, "xlsx");

      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("liste-utilisateurs.xlsx");
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  describe("exportInterventionsList", () => {
    it("should generate an XLSX buffer for interventions", async () => {
      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          caseTitle: "Dossier A",
          title: "Intervention Alpha",
          status: "completed",
          assigneeName: "Jean",
          assignedTeamName: "Équipe Nord",
          scheduledStart: "2024-03-01T09:00:00Z",
          startedAt: "2024-03-01T09:15:00Z",
          completedAt: "2024-03-01T11:30:00Z",
        },
      ];

      mockScopedHttp.request.mockResolvedValueOnce(interventions);

      const result = await service.exportInterventionsList(mockUser, "xlsx", {
        startDate: "2024-03-01",
        endDate: "2024-03-31",
      });

      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.filename).toBe("liste-interventions.xlsx");
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

      mockScopedHttp.request
        .mockResolvedValueOnce(cases)
        .mockResolvedValueOnce(interventions)
        .mockResolvedValueOnce(technicians)
        .mockResolvedValueOnce(customers);

      const result = await service.getReportingStats(mockUser);

      expect(result.casesTotal).toBe(2);
      expect(result.casesCompleted).toBe(1);
      expect(result.casesInProgress).toBe(1);
      expect(result.casesOverdue).toBe(1);
      expect(result.interventionsTotal).toBe(1);
      expect(result.interventionsCompleted).toBe(1);
      expect(result.techniciansActive).toBe(1);
      expect(result.customersTotal).toBe(1);
      expect(result.avgCompletionDays).toBeCloseTo(0.1, 0);
    });
  });
});
