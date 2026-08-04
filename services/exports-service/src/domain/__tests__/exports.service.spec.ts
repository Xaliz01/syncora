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
            data: { interventions, total: interventions.length },
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
          data: { cases, total: cases.length },
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
        of({
          data: { cases: [], total: 0 },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      await service.exportCasesList("org-123", "xlsx", { billingStatus: "to_invoice" });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/cases"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            billingStatus: "to_invoice",
            limit: "200",
            offset: "0",
          }),
        }),
      );
    });

    it("should forward orderGiverId filter to cases-service", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: { cases: [], total: 0 },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      await service.exportCasesList("org-123", "xlsx", { orderGiverId: "og-1" });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/cases"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            orderGiverId: "og-1",
          }),
        }),
      );
    });

    it("should generate a PDF buffer for cases list", async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: { cases: [], total: 0 },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
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

  describe("exportCasesList (CSV)", () => {
    it("should generate a CSV buffer with BOM and semicolons", async () => {
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
          customer: { id: "cust-x", displayName: "Client X", kind: "company" as const },
        },
        {
          id: "case-2",
          organizationId: "org-123",
          title: 'Dossier "B"',
          status: "in_progress",
          billingStatus: "to_invoice",
          priority: "high",
          assignees: [],
          tags: [],
          progress: 75,
          interventionCount: 3,
          createdAt: "2024-02-15T10:00:00Z",
        },
      ];

      mockHttpService.get.mockReturnValue(
        of({
          data: { cases, total: cases.length },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportCasesList("org-123", "csv");

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toBe("liste-dossiers.csv");
      expect(result.buffer).toBeInstanceOf(Buffer);

      const content = result.buffer.toString("utf-8");
      expect(content.startsWith("\uFEFF")).toBe(true);
      expect(content).toContain("Dossier;Statut;Facturation;Priorité;Client");
      expect(content).toContain("Dossier A;Ouvert;—;Moyenne;Client X");
      expect(content).toContain('"Dossier ""B""";En cours;À facturer;Haute;');
    });
  });

  describe("exportInterventionsList (CSV)", () => {
    it("should generate a CSV buffer for interventions", async () => {
      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          caseTitle: "Dossier A",
          title: "Intervention 1",
          status: "completed",
          billingStatus: "none",
          assigneeName: "Jean Dupont",
          assignedTeamName: "Équipe Nord",
          scheduledStart: "2024-03-01T09:00:00Z",
          startedAt: "2024-03-01T09:15:00Z",
          completedAt: "2024-03-01T11:15:00Z",
        },
        {
          id: "int-2",
          organizationId: "org-123",
          caseId: "case-1",
          title: "Intervention 2",
          status: "planned",
          billingStatus: "none",
        },
      ];

      mockHttpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/technicians")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/teams")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/users")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        return of({
          data: { interventions, total: interventions.length },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never;
      });

      const result = await service.exportInterventionsList("org-123", "csv", {
        startDate: "2024-03-01",
        endDate: "2024-03-31",
      });

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toBe("liste-interventions_2024-03-01_2024-03-31.csv");

      const content = result.buffer.toString("utf-8");
      expect(content).toContain("Période");
      expect(content).toContain("Titre;Dossier;Statut;Technicien");
      expect(content).toContain("Intervention 1;Dossier A;Terminée;Jean Dupont");
      expect(content).toContain("2");
    });

    it("resolves technician and team labels from fleet when denormalized names are missing", async () => {
      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          caseTitle: "Dossier A",
          title: "Sans noms stockés",
          status: "planned",
          billingStatus: "none",
          assigneeId: "user-1",
          assigneeName: "user-1",
          assignedTeamId: "team-a",
          assignedTeamName: "team-a",
        },
      ];
      const technicians = [
        {
          id: "tech-1",
          organizationId: "org-123",
          firstName: "Alice",
          lastName: "Martin",
          status: "actif" as const,
          userId: "user-1",
        },
      ];
      const teams = [
        {
          id: "team-a",
          organizationId: "org-123",
          name: "Équipe Alpha",
          technicianIds: ["tech-1"],
          status: "active" as const,
        },
      ];

      mockHttpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/technicians")) {
          return of({
            data: technicians,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/teams")) {
          return of({
            data: teams,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/users")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        return of({
          data: { interventions, total: interventions.length },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never;
      });

      const preview = await service.previewReport("org-123", "interventions_list", {
        startDate: "2024-03-01",
        endDate: "2024-03-31",
      });

      expect(preview.rows).toHaveLength(1);
      expect(preview.rows[0].cells.technician).toEqual({
        kind: "technician",
        id: "tech-1",
        label: "Alice Martin",
      });
      expect(preview.rows[0].cells.team).toEqual({
        kind: "team",
        id: "team-a",
        label: "Équipe Alpha",
      });
    });
  });

  describe("exportCustomersList (CSV)", () => {
    it("should generate a CSV buffer for customers", async () => {
      const customers = [
        {
          id: "cust-1",
          organizationId: "org-123",
          displayName: "Dupont SARL",
          kind: "company" as const,
          email: "contact@dupont.fr",
          phone: "01 23 45 67 89",
          mobile: "06 12 34 56 78",
          address: { city: "Paris", postalCode: "75001" },
        },
      ];

      mockHttpService.get.mockReturnValue(
        of({
          data: { customers, total: customers.length },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never,
      );

      const result = await service.exportCustomersList("org-123", "csv");

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toBe("liste-clients.csv");

      const content = result.buffer.toString("utf-8");
      expect(content).toContain("Nom;Type;Email;Téléphone;Mobile;Ville;Code postal");
      expect(content).toContain("Dupont SARL;Société;contact@dupont.fr");
      expect(content).toContain("Paris;75001");
    });
  });

  describe("exportUsersList (CSV)", () => {
    it("should generate a CSV buffer for users", async () => {
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

      const result = await service.exportUsersList("org-123", "csv");

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toBe("liste-utilisateurs.csv");

      const content = result.buffer.toString("utf-8");
      expect(content).toContain("Nom;Email;Rôle;Statut");
      expect(content).toContain("Alice;alice@example.com;Administrateur;Actif");
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
          createdAt: "2024-06-15T10:00:00Z",
        },
        {
          id: "c2",
          organizationId: "org-123",
          title: "Case 2",
          status: "in_progress",
          billingStatus: "to_invoice",
          priority: "high",
          assignees: [],
          tags: [],
          progress: 50,
          interventionCount: 2,
          dueDate: "2020-01-01T00:00:00Z",
          createdAt: "2024-06-20T10:00:00Z",
        },
        {
          id: "c3",
          organizationId: "org-123",
          title: "Case 3",
          status: "in_progress",
          billingStatus: "invoice_draft",
          priority: "medium",
          assignees: [],
          tags: [],
          progress: 80,
          interventionCount: 0,
          createdAt: "2024-06-21T10:00:00Z",
        },
        {
          id: "c4",
          organizationId: "org-123",
          title: "Case 4",
          status: "completed",
          billingStatus: "paid",
          priority: "low",
          assignees: [],
          tags: [],
          progress: 100,
          interventionCount: 1,
          createdAt: "2024-06-22T10:00:00Z",
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
            data: { cases, total: cases.length },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: { interventions, total: interventions.length },
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
            data: { customers, total: customers.length },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.getReportingStats("org-123", {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(result.casesTotal).toBe(4);
      expect(result.casesCompleted).toBe(2);
      expect(result.casesInProgress).toBe(2);
      expect(result.casesOverdue).toBe(1);
      expect(result.interventionsTotal).toBe(1);
      expect(result.interventionsCompleted).toBe(1);
      expect(result.techniciansActive).toBe(1);
      expect(result.customersTotal).toBe(1);
      expect(result.casesBillingToInvoice).toBe(1);
      expect(result.casesBillingDraft).toBe(1);
      expect(result.casesBillingPartiallyInvoiced).toBe(0);
      expect(result.casesBillingInvoiced).toBe(0);
      expect(result.casesBillingPaid).toBe(1);
    });

    it("should filter cases by period and forward date range to interventions", async () => {
      const cases: CaseSummaryResponse[] = [
        {
          id: "c1",
          organizationId: "org-123",
          title: "In range",
          status: "completed",
          billingStatus: "none",
          priority: "medium",
          assignees: [],
          tags: [],
          progress: 100,
          interventionCount: 1,
          createdAt: "2024-06-15T10:00:00Z",
        },
        {
          id: "c2",
          organizationId: "org-123",
          title: "Out of range",
          status: "in_progress",
          billingStatus: "none",
          priority: "high",
          assignees: [],
          tags: [],
          progress: 50,
          interventionCount: 0,
          createdAt: "2024-01-01T10:00:00Z",
        },
      ];

      mockHttpService.get
        .mockReturnValueOnce(
          of({
            data: { cases, total: cases.length },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: { interventions: [], total: 0 },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: { customers: [], total: 0 },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.getReportingStats("org-123", {
        startDate: "2024-06-01",
        endDate: "2024-06-30",
      });

      expect(result.casesTotal).toBe(1);
      expect(result.casesCompleted).toBe(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/interventions"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            startDate: "2024-06-01T00:00:00.000",
            endDate: "2024-06-30T23:59:59.999",
          }),
        }),
      );
    });
  });

  describe("exportInvoicesList", () => {
    it("should generate a PDF buffer for invoices list", async () => {
      mockHttpService.get
        .mockReturnValueOnce(
          of({
            data: {
              invoices: [
                {
                  id: "sync-1",
                  organizationId: "org-123",
                  provider: "qonto",
                  caseId: "case-1",
                  invoiceKind: "full",
                  remoteInvoiceId: "inv-1",
                  remoteCustomerId: "cust-1",
                  draft: false,
                  remoteStatus: "finalized",
                  invoiceNumber: "FAC-001",
                  amountHt: "1200.00",
                  createdAt: "2026-07-01T10:00:00.000Z",
                },
              ],
              total: 1,
            },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: {
              id: "case-1",
              organizationId: "org-123",
              title: "Chantier A",
              customerId: "cust-42",
              status: "open",
              billingStatus: "invoiced",
              priority: "medium",
              assignees: [],
              tags: [],
              steps: [],
            },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: {
              customers: [
                {
                  id: "cust-42",
                  organizationId: "org-123",
                  kind: "company",
                  displayName: "Client SA",
                },
              ],
              total: 1,
            },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.exportInvoicesList("org-123", "pdf");

      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toBe("liste-factures.pdf");
      expect(result.buffer.length).toBeGreaterThan(100);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/cases/case-1"),
        expect.any(Object),
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/customers"),
        expect.objectContaining({
          params: expect.objectContaining({
            ids: "cust-42",
          }),
        }),
      );
    });

    it("should resolve orderGiverId to caseIds before listing invoices", async () => {
      mockHttpService.get
        .mockReturnValueOnce(
          of({
            data: { ids: ["case-a", "case-b"] },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: { invoices: [], total: 0 },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      await service.exportInvoicesList("org-123", "csv", { orderGiverId: "og-9" });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/cases/ids"),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationId: "org-123",
            orderGiverId: "og-9",
          }),
        }),
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining("/integrations/invoice-syncs"),
        expect.objectContaining({
          params: expect.objectContaining({
            caseIds: "case-a,case-b",
          }),
        }),
      );
    });
  });

  describe("exportTechniciansActivity", () => {
    it("counts direct and team-assigned interventions for a technician", async () => {
      const technicians = [
        {
          id: "tech-1",
          organizationId: "org-123",
          firstName: "Alice",
          lastName: "Martin",
          status: "actif" as const,
          userId: "user-1",
        },
      ];
      const teams = [
        {
          id: "team-a",
          organizationId: "org-123",
          name: "Équipe A",
          technicianIds: ["tech-1"],
          status: "active" as const,
        },
      ];
      const interventions: InterventionResponse[] = [
        {
          id: "int-direct",
          organizationId: "org-123",
          caseId: "case-1",
          title: "Directe",
          status: "completed",
          billingStatus: "none",
          assigneeId: "user-1",
          startedAt: "2024-01-16T08:00:00Z",
          completedAt: "2024-01-16T10:00:00Z",
          createdAt: "2024-01-16T07:00:00Z",
        },
        {
          id: "int-team",
          organizationId: "org-123",
          caseId: "case-2",
          title: "Via équipe",
          status: "planned",
          billingStatus: "none",
          assignedTeamId: "team-a",
          createdAt: "2024-01-17T07:00:00Z",
        },
        {
          id: "int-other",
          organizationId: "org-123",
          caseId: "case-3",
          title: "Autre",
          status: "planned",
          billingStatus: "none",
          assigneeId: "user-other",
          createdAt: "2024-01-18T07:00:00Z",
        },
      ];

      mockHttpService.get
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
            data: teams,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        )
        .mockReturnValueOnce(
          of({
            data: { interventions, total: interventions.length },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never,
        );

      const result = await service.exportTechniciansActivity("org-123", "csv", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(result.filename).toBe("activite-techniciens_2024-01-01_2024-01-31.csv");
      const csv = result.buffer.toString("utf-8");
      expect(csv).toContain("Période");
      expect(csv).toContain("Alice Martin");
      // 2 interventions (direct + team), 1 completed, 0 in progress, 1 planned, 2.0 hours
      expect(csv).toContain("Alice Martin;;2;1;0;1;2");
    });

    it("rejects missing reporting period", async () => {
      await expect(service.exportTechniciansActivity("org-123", "csv")).rejects.toThrow(/période/i);
    });

    it("rejects period longer than 2 years", async () => {
      await expect(
        service.exportTechniciansActivity("org-123", "csv", {
          startDate: "2024-01-01",
          endDate: "2026-01-02",
        }),
      ).rejects.toThrow(/2 ans/);
    });
  });

  describe("exportMileageReport", () => {
    it("aggregates mileage by technician when groupBy=technician", async () => {
      const technicians = [
        {
          id: "tech-1",
          organizationId: "org-123",
          firstName: "Alice",
          lastName: "Martin",
          status: "actif" as const,
          userId: "user-1",
        },
      ];
      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          title: "Déplacement",
          status: "completed",
          billingStatus: "none",
          assigneeId: "user-1",
          startLocation: { latitude: 48.8566, longitude: 2.3522 },
          endLocation: { latitude: 48.8606, longitude: 2.3376 },
          createdAt: "2024-01-16T07:00:00Z",
        },
      ];

      mockHttpService.get.mockImplementation((url: string) => {
        if (String(url).includes("/technicians")) {
          return of({
            data: technicians,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/teams")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (String(url).includes("/agences")) {
          return of({
            data: [],
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        return of({
          data: { interventions, total: interventions.length },
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never;
      });

      const result = await service.exportMileageReport("org-123", "csv", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        groupBy: "technician",
      });

      const csv = result.buffer.toString("utf-8");
      expect(csv).toContain("Technicien;Interventions;Km estimés;Km effectifs");
      expect(csv).toContain("Alice Martin");
      // Pas d'équipe/agence → km estimés à 0 ; GPS début/fin → km effectifs > 0
      expect(csv).toMatch(/Alice Martin;1;0;1\.4;/);
    });

    it("reports both estimated agency→site km and actual GPS km", async () => {
      const teams = [
        {
          id: "team-1",
          organizationId: "org-123",
          name: "Équipe démo 1",
          agenceId: "agence-lyon",
          technicianIds: [] as string[],
          status: "actif" as const,
        },
      ];
      const agences = [
        {
          id: "agence-lyon",
          organizationId: "org-123",
          name: "Agence démo Lyon",
          address: "1 rue de Lyon",
          postalCode: "69001",
          city: "Lyon",
        },
      ];
      const interventions: InterventionResponse[] = [
        {
          id: "int-1",
          organizationId: "org-123",
          caseId: "case-1",
          title: "Intervention Haveluy",
          status: "completed",
          billingStatus: "none",
          assignedTeamId: "team-1",
          assignedTeamName: "Équipe démo 1",
          scheduledStart: "2024-01-16T08:00:00Z",
          startLocation: { latitude: 50.35, longitude: 3.58 },
          endLocation: { latitude: 50.36, longitude: 3.59 },
          createdAt: "2024-01-16T07:00:00Z",
        },
      ];
      const caseData: CaseResponse = {
        id: "case-1",
        organizationId: "org-123",
        title: "Dossier Haveluy",
        status: "in_progress",
        billingStatus: "none",
        priority: "medium",
        assignees: [],
        tags: [],
        steps: [],
        progress: 0,
        interventionCount: 1,
        interventionAddress: {
          line1: "Rue D",
          postalCode: "59255",
          city: "Haveluy",
          country: "FR",
        },
      };

      mockHttpService.get.mockImplementation((url: string, config?: { params?: unknown }) => {
        const u = String(url);
        if (u.includes("/interventions")) {
          return of({
            data: { interventions, total: interventions.length },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (u.includes("/teams")) {
          return of({
            data: teams,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (u.includes("/agences")) {
          return of({
            data: agences,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (u.includes("/cases/case-1")) {
          return of({
            data: caseData,
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        if (u.includes("geocodage")) {
          const q = String((config as { params?: { q?: string } })?.params?.q ?? "");
          const isLyon = /lyon/i.test(q);
          const coords: [number, number] = isLyon ? [4.8357, 45.764] : [3.58, 50.35];
          return of({
            data: { features: [{ geometry: { coordinates: coords } }] },
            status: 200,
            headers: {},
            statusText: "OK",
            config: {} as never,
          }) as never;
        }
        return of({
          data: {},
          status: 200,
          headers: {},
          statusText: "OK",
          config: {} as never,
        }) as never;
      });

      const result = await service.exportMileageReport("org-123", "csv", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        groupBy: "team",
      });

      const csv = result.buffer.toString("utf-8");
      expect(csv).toContain("Km estimés;Km effectifs");
      expect(csv).toContain("Équipe démo 1");
      const rowMatch = csv.match(/Équipe démo 1;1;([0-9.]+);([0-9.]+);/);
      expect(rowMatch).toBeTruthy();
      expect(Number(rowMatch![1])).toBeGreaterThan(500);
      expect(Number(rowMatch![2])).toBeGreaterThan(0);
      expect(Number(rowMatch![2])).toBeLessThan(20);
    });
  });
});
