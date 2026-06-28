import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  CaseResponse,
  CaseSummaryResponse,
  CustomerResponse,
  DashboardTodoCaseItem,
  ExportFormat,
  InterventionResponse,
  ReportingStatsResponse,
  TeamResponse,
  TechnicianResponse,
  UserResponse,
} from "@syncora/shared";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { AbstractExportsService, type ExportResult } from "./ports/exports.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";

@Injectable()
export class ExportsService extends AbstractExportsService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  // ── Case summary PDF ──

  async exportCaseSummaryPdf(organizationId: string, caseId: string): Promise<ExportResult> {
    const caseData = await this.callService<CaseResponse>(CASES_URL, `/cases/${caseId}`, {
      organizationId,
    });

    let customer: CustomerResponse | undefined;
    if (caseData.customerId) {
      try {
        customer = await this.callService<CustomerResponse>(
          CUSTOMERS_URL,
          `/customers/${caseData.customerId}`,
          { organizationId },
        );
      } catch {
        /* customer might have been deleted */
      }
    }

    const interventions = await this.callService<InterventionResponse[]>(
      CASES_URL,
      "/interventions",
      { organizationId, caseId },
    );

    const buffer = await this.buildCaseSummaryPdf(caseData, customer, interventions);
    return {
      buffer,
      contentType: "application/pdf",
      filename: `dossier-${caseData.title
        .replace(/[^a-zA-Z0-9àâéèêëïîôùûüÿçÀÂÉÈÊËÏÎÔÙÛÜŸÇ\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`,
    };
  }

  // ── Cases list ──

  async exportCasesList(
    organizationId: string,
    format: ExportFormat,
    filters?: { status?: string; priority?: string; assigneeId?: string; search?: string },
  ): Promise<ExportResult> {
    const query: Record<string, string> = { organizationId };
    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.search) query.search = filters.search;

    const cases = await this.callService<CaseSummaryResponse[]>(CASES_URL, "/cases", query);

    if (format === "pdf") {
      const buffer = await this.buildCasesListPdf(cases);
      return { buffer, contentType: "application/pdf", filename: "liste-dossiers.pdf" };
    }

    const buffer = await this.buildCasesListXlsx(cases);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "liste-dossiers.xlsx",
    };
  }

  // ── Users list ──

  async exportUsersList(organizationId: string, format: ExportFormat): Promise<ExportResult> {
    const users = await this.callService<UserResponse[]>(USERS_URL, "/users", { organizationId });

    if (format === "pdf") {
      const buffer = await this.buildUsersListPdf(users);
      return { buffer, contentType: "application/pdf", filename: "liste-utilisateurs.pdf" };
    }

    const buffer = await this.buildUsersListXlsx(users);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "liste-utilisateurs.xlsx",
    };
  }

  // ── Customers list ──

  async exportCustomersList(
    organizationId: string,
    format: ExportFormat,
    filters?: { search?: string; kind?: string },
  ): Promise<ExportResult> {
    const query: Record<string, string> = { organizationId };
    if (filters?.search) query.search = filters.search;
    if (filters?.kind) query.kind = filters.kind;

    const customers = await this.callService<CustomerResponse[]>(
      CUSTOMERS_URL,
      "/customers",
      query,
    );

    if (format === "pdf") {
      const buffer = await this.buildCustomersListPdf(customers);
      return { buffer, contentType: "application/pdf", filename: "liste-clients.pdf" };
    }

    const buffer = await this.buildCustomersListXlsx(customers);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "liste-clients.xlsx",
    };
  }

  // ── Interventions list ──

  async exportInterventionsList(
    organizationId: string,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      assigneeId?: string;
      teamId?: string;
      status?: string;
    },
  ): Promise<ExportResult> {
    const query: Record<string, string> = { organizationId };
    if (filters?.startDate) query.startDate = filters.startDate;
    if (filters?.endDate) query.endDate = filters.endDate;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.status) query.status = filters.status;

    let interventions = await this.callService<InterventionResponse[]>(
      CASES_URL,
      "/interventions",
      query,
    );

    if (filters?.teamId) {
      interventions = interventions.filter((i) => i.assignedTeamId === filters.teamId);
    }

    if (format === "pdf") {
      const buffer = await this.buildInterventionsListPdf(interventions);
      return { buffer, contentType: "application/pdf", filename: "liste-interventions.pdf" };
    }

    const buffer = await this.buildInterventionsListXlsx(interventions);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "liste-interventions.xlsx",
    };
  }

  // ── Technicians activity ──

  async exportTechniciansActivity(
    organizationId: string,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult> {
    const technicians = await this.callService<TechnicianResponse[]>(
      TECHNICIANS_URL,
      "/technicians",
      { organizationId },
    );

    const query: Record<string, string> = { organizationId };
    if (filters?.startDate) query.startDate = filters.startDate;
    if (filters?.endDate) query.endDate = filters.endDate;

    const interventions = await this.callService<InterventionResponse[]>(
      CASES_URL,
      "/interventions",
      query,
    );

    const filteredTechnicians = filters?.technicianId
      ? technicians.filter((t) => t.id === filters.technicianId)
      : technicians;

    const activityData = filteredTechnicians.map((tech) => {
      const techInterventions = interventions.filter(
        (i) => i.assigneeId === tech.userId || i.assigneeId === tech.id,
      );
      const completed = techInterventions.filter((i) => i.status === "completed");
      const totalHours = completed.reduce((sum, i) => {
        if (i.startedAt && i.completedAt) {
          return (
            sum + (new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 3600000
          );
        }
        return sum;
      }, 0);

      return {
        name: `${tech.firstName} ${tech.lastName}`,
        speciality: tech.speciality ?? "",
        totalInterventions: techInterventions.length,
        completed: completed.length,
        inProgress: techInterventions.filter((i) => i.status === "in_progress").length,
        planned: techInterventions.filter((i) => i.status === "planned").length,
        totalHours: Math.round(totalHours * 10) / 10,
      };
    });

    if (format === "pdf") {
      const buffer = await this.buildTechniciansActivityPdf(activityData, filters);
      return { buffer, contentType: "application/pdf", filename: "activite-techniciens.pdf" };
    }

    const buffer = await this.buildTechniciansActivityXlsx(activityData, filters);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "activite-techniciens.xlsx",
    };
  }

  // ── Mileage report ──

  async exportMileageReport(
    organizationId: string,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; teamId?: string },
  ): Promise<ExportResult> {
    const teams = await this.callService<TeamResponse[]>(TECHNICIANS_URL, "/teams", {
      organizationId,
    });

    const query: Record<string, string> = { organizationId };
    if (filters?.startDate) query.startDate = filters.startDate;
    if (filters?.endDate) query.endDate = filters.endDate;

    let interventions = await this.callService<InterventionResponse[]>(
      CASES_URL,
      "/interventions",
      query,
    );

    if (filters?.teamId) {
      interventions = interventions.filter((i) => i.assignedTeamId === filters.teamId);
    }

    const completedWithLocations = interventions.filter(
      (i) => i.status === "completed" && i.startLocation && i.endLocation,
    );

    const mileageByTeam = teams
      .filter((t) => !filters?.teamId || t.id === filters.teamId)
      .map((team) => {
        const teamInterventions = completedWithLocations.filter(
          (i) => i.assignedTeamId === team.id,
        );
        const estimatedKm = teamInterventions.reduce((sum, i) => {
          if (i.startLocation && i.endLocation) {
            return (
              sum +
              this.haversineDistance(
                i.startLocation.latitude,
                i.startLocation.longitude,
                i.endLocation.latitude,
                i.endLocation.longitude,
              ) *
                1.18
            );
          }
          return sum;
        }, 0);

        return {
          teamName: team.name,
          interventionCount: teamInterventions.length,
          estimatedKm: Math.round(estimatedKm * 10) / 10,
          fuelLiters: Math.round(estimatedKm * 0.082 * 10) / 10,
          fuelCostEur: Math.round(estimatedKm * 0.082 * 1.75 * 100) / 100,
          co2Kg: Math.round(estimatedKm * 0.082 * 2.65 * 10) / 10,
        };
      });

    if (format === "pdf") {
      const buffer = await this.buildMileageReportPdf(mileageByTeam, filters);
      return { buffer, contentType: "application/pdf", filename: "rapport-kilometrique.pdf" };
    }

    const buffer = await this.buildMileageReportXlsx(mileageByTeam, filters);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "rapport-kilometrique.xlsx",
    };
  }

  // ── Dashboard TODO cases ──

  async exportDashboardTodoCases(
    organizationId: string,
    format: ExportFormat,
    params: { userId: string; userProfileId?: string; templateId: string; todoLabel: string },
  ): Promise<ExportResult> {
    const query: Record<string, string> = {
      organizationId,
      userId: params.userId,
      templateId: params.templateId,
      todoLabel: params.todoLabel,
    };
    if (params.userProfileId) query.userProfileId = params.userProfileId;
    const cases = await this.callService<DashboardTodoCaseItem[]>(
      CASES_URL,
      "/dashboard/todo-cases",
      query,
    );

    if (format === "pdf") {
      const buffer = await this.buildTodoCasesPdf(cases, params.todoLabel);
      return { buffer, contentType: "application/pdf", filename: "taches-dossiers.pdf" };
    }

    const buffer = await this.buildTodoCasesXlsx(cases, params.todoLabel);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "taches-dossiers.xlsx",
    };
  }

  // ── Reporting stats ──

  async getReportingStats(organizationId: string): Promise<ReportingStatsResponse> {
    const [cases, interventions, technicians, customers] = await Promise.all([
      this.callService<CaseSummaryResponse[]>(CASES_URL, "/cases", { organizationId }),
      this.callService<InterventionResponse[]>(CASES_URL, "/interventions", { organizationId }),
      this.callService<TechnicianResponse[]>(TECHNICIANS_URL, "/technicians", { organizationId }),
      this.callService<CustomerResponse[]>(CUSTOMERS_URL, "/customers", { organizationId }),
    ]);

    const now = new Date();
    const completedCases = cases.filter((c) => c.status === "completed");
    const overdueCases = cases.filter(
      (c) =>
        c.dueDate &&
        new Date(c.dueDate) < now &&
        c.status !== "completed" &&
        c.status !== "cancelled",
    );

    const completedInterventions = interventions.filter((i) => i.status === "completed");
    const avgCompletionDays =
      completedInterventions.length > 0
        ? completedInterventions.reduce((sum, i) => {
            if (i.startedAt && i.completedAt) {
              return (
                sum +
                (new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 86400000
              );
            }
            return sum;
          }, 0) / completedInterventions.length
        : 0;

    return {
      casesTotal: cases.length,
      casesCompleted: completedCases.length,
      casesInProgress: cases.filter((c) => c.status === "in_progress").length,
      casesOverdue: overdueCases.length,
      interventionsTotal: interventions.length,
      interventionsCompleted: completedInterventions.length,
      avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
      techniciansActive: technicians.filter((t) => t.status === "actif").length,
      customersTotal: customers.length,
    };
  }

  // ── PDF Builders ──

  private buildCaseSummaryPdf(
    caseData: CaseResponse,
    customer: CustomerResponse | undefined,
    interventions: InterventionResponse[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.pdfHeader(doc, "Récapitulatif de dossier");

      doc
        .fontSize(16)
        .fillColor("#1e293b")
        .text(caseData.title, 50, doc.y + 10, { width: 495 });
      const statusLabels: Record<string, string> = {
        draft: "Brouillon",
        open: "Ouvert",
        in_progress: "En cours",
        waiting: "En attente",
        completed: "Terminé",
        cancelled: "Annulé",
      };
      const priorityLabels: Record<string, string> = {
        low: "Basse",
        medium: "Moyenne",
        high: "Haute",
        urgent: "Urgente",
      };
      doc
        .fontSize(10)
        .fillColor("#64748b")
        .text(
          `Statut : ${statusLabels[caseData.status] ?? caseData.status} | Priorité : ${priorityLabels[caseData.priority] ?? caseData.priority} | Avancement : ${caseData.progress}%`,
          50,
          doc.y + 5,
        );

      if (caseData.dueDate) {
        doc.text(`Échéance : ${this.formatDateFr(caseData.dueDate)}`, 50, doc.y + 3);
      }
      doc.y += 10;

      if (customer) {
        this.pdfSectionTitle(doc, "Client");
        this.pdfField(doc, "Nom", customer.displayName);
        if (customer.email) this.pdfField(doc, "Email", customer.email);
        if (customer.phone) this.pdfField(doc, "Téléphone", customer.phone);
        if (customer.address) {
          const addr = [
            customer.address.line1,
            customer.address.line2,
            [customer.address.postalCode, customer.address.city].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ");
          this.pdfField(doc, "Adresse", addr);
        }
      }

      if (caseData.assignees.length > 0) {
        this.pdfSectionTitle(doc, "Assignés");
        doc
          .fontSize(10)
          .fillColor("#1e293b")
          .text(caseData.assignees.map((a) => a.name).join(", "), 50, doc.y + 3);
        doc.y += 5;
      }

      if (caseData.steps.length > 0) {
        this.pdfSectionTitle(doc, "Étapes et tâches");
        for (const step of caseData.steps) {
          doc
            .fontSize(11)
            .fillColor("#6d28d9")
            .text(`${step.order}. ${step.name}`, 50, doc.y + 5);
          for (const todo of step.todos) {
            const icon = todo.status === "done" ? "✓" : todo.status === "skipped" ? "—" : "○";
            doc
              .fontSize(9)
              .fillColor("#334155")
              .text(`  ${icon} ${todo.label}`, 60, doc.y + 3);
          }
        }
        doc.y += 5;
      }

      if (interventions.length > 0) {
        this.pdfSectionTitle(doc, `Interventions (${interventions.length})`);
        const iStatusLabels: Record<string, string> = {
          planned: "Planifiée",
          in_progress: "En cours",
          completed: "Terminée",
          cancelled: "Annulée",
        };
        for (const intv of interventions) {
          if (doc.y > 700) doc.addPage();
          doc
            .fontSize(10)
            .fillColor("#1e293b")
            .text(`• ${intv.title}`, 55, doc.y + 4);
          doc
            .fontSize(9)
            .fillColor("#64748b")
            .text(
              `  ${iStatusLabels[intv.status] ?? intv.status}${intv.assigneeName ? ` — ${intv.assigneeName}` : ""}${intv.scheduledStart ? ` — ${this.formatDateFr(intv.scheduledStart)}` : ""}`,
              60,
              doc.y + 2,
            );
        }
      }

      this.pdfFooter(doc);
      doc.end();
    });
  }

  private buildCasesListPdf(cases: CaseSummaryResponse[]): Promise<Buffer> {
    return this.buildTablePdf(
      "Liste des dossiers",
      ["Dossier", "Statut", "Priorité", "Avancement", "Échéance"],
      cases.map((c) => [
        c.title,
        this.translateStatus(c.status),
        this.translatePriority(c.priority),
        `${c.progress}%`,
        c.dueDate ? this.formatDateFr(c.dueDate) : "—",
      ]),
    );
  }

  private async buildCasesListXlsx(cases: CaseSummaryResponse[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dossiers");
    ws.columns = [
      { header: "Dossier", key: "title", width: 35 },
      { header: "Statut", key: "status", width: 15 },
      { header: "Priorité", key: "priority", width: 12 },
      { header: "Client", key: "customer", width: 25 },
      { header: "Avancement", key: "progress", width: 12 },
      { header: "Interventions", key: "interventions", width: 14 },
      { header: "Échéance", key: "dueDate", width: 14 },
      { header: "Créé le", key: "createdAt", width: 14 },
    ];
    this.styleHeaderRow(ws);

    for (const c of cases) {
      ws.addRow({
        title: c.title,
        status: this.translateStatus(c.status),
        priority: this.translatePriority(c.priority),
        customer: c.customer?.displayName ?? "",
        progress: c.progress,
        interventions: c.interventionCount,
        dueDate: c.dueDate ? this.formatDateFr(c.dueDate) : "",
        createdAt: c.createdAt ? this.formatDateFr(c.createdAt) : "",
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildUsersListPdf(users: UserResponse[]): Promise<Buffer> {
    return this.buildTablePdf(
      "Liste des utilisateurs",
      ["Nom", "Email", "Rôle", "Statut"],
      users.map((u) => [
        u.name ?? "—",
        u.email,
        u.role === "admin" ? "Administrateur" : "Membre",
        u.status === "active" ? "Actif" : "Invité",
      ]),
    );
  }

  private async buildUsersListXlsx(users: UserResponse[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Utilisateurs");
    ws.columns = [
      { header: "Nom", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Rôle", key: "role", width: 15 },
      { header: "Statut", key: "status", width: 12 },
    ];
    this.styleHeaderRow(ws);

    for (const u of users) {
      ws.addRow({
        name: u.name ?? "",
        email: u.email,
        role: u.role === "admin" ? "Administrateur" : "Membre",
        status: u.status === "active" ? "Actif" : "Invité",
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildCustomersListPdf(customers: CustomerResponse[]): Promise<Buffer> {
    return this.buildTablePdf(
      "Liste des clients",
      ["Nom", "Type", "Email", "Téléphone", "Ville"],
      customers.map((c) => [
        c.displayName,
        c.kind === "individual" ? "Particulier" : "Société",
        c.email ?? "—",
        c.phone ?? c.mobile ?? "—",
        c.address?.city ?? "—",
      ]),
    );
  }

  private async buildCustomersListXlsx(customers: CustomerResponse[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Clients");
    ws.columns = [
      { header: "Nom", key: "name", width: 30 },
      { header: "Type", key: "kind", width: 12 },
      { header: "Email", key: "email", width: 30 },
      { header: "Téléphone", key: "phone", width: 18 },
      { header: "Mobile", key: "mobile", width: 18 },
      { header: "Ville", key: "city", width: 20 },
      { header: "Code postal", key: "postalCode", width: 12 },
    ];
    this.styleHeaderRow(ws);

    for (const c of customers) {
      ws.addRow({
        name: c.displayName,
        kind: c.kind === "individual" ? "Particulier" : "Société",
        email: c.email ?? "",
        phone: c.phone ?? "",
        mobile: c.mobile ?? "",
        city: c.address?.city ?? "",
        postalCode: c.address?.postalCode ?? "",
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildInterventionsListPdf(interventions: InterventionResponse[]): Promise<Buffer> {
    return this.buildTablePdf(
      "Liste des interventions",
      ["Titre", "Dossier", "Statut", "Technicien", "Équipe", "Date"],
      interventions.map((i) => [
        i.title,
        i.caseTitle ?? "—",
        this.translateInterventionStatus(i.status),
        i.assigneeName ?? "—",
        i.assignedTeamName ?? "—",
        i.scheduledStart ? this.formatDateFr(i.scheduledStart) : "—",
      ]),
    );
  }

  private async buildInterventionsListXlsx(interventions: InterventionResponse[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Interventions");
    ws.columns = [
      { header: "Titre", key: "title", width: 30 },
      { header: "Dossier", key: "caseTitle", width: 25 },
      { header: "Statut", key: "status", width: 14 },
      { header: "Technicien", key: "assignee", width: 20 },
      { header: "Équipe", key: "team", width: 18 },
      { header: "Date planifiée", key: "scheduledStart", width: 16 },
      { header: "Démarré", key: "startedAt", width: 16 },
      { header: "Terminé", key: "completedAt", width: 16 },
      { header: "Durée (h)", key: "duration", width: 10 },
    ];
    this.styleHeaderRow(ws);

    for (const i of interventions) {
      let duration = "";
      if (i.startedAt && i.completedAt) {
        const h = (new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 3600000;
        duration = (Math.round(h * 10) / 10).toString();
      }
      ws.addRow({
        title: i.title,
        caseTitle: i.caseTitle ?? "",
        status: this.translateInterventionStatus(i.status),
        assignee: i.assigneeName ?? "",
        team: i.assignedTeamName ?? "",
        scheduledStart: i.scheduledStart ? this.formatDateTimeFr(i.scheduledStart) : "",
        startedAt: i.startedAt ? this.formatDateTimeFr(i.startedAt) : "",
        completedAt: i.completedAt ? this.formatDateTimeFr(i.completedAt) : "",
        duration,
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildTechniciansActivityPdf(
    data: Array<{
      name: string;
      speciality: string;
      totalInterventions: number;
      completed: number;
      inProgress: number;
      planned: number;
      totalHours: number;
    }>,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<Buffer> {
    const period = this.formatPeriodLabel(filters?.startDate, filters?.endDate);
    return this.buildTablePdf(
      `Activité techniciens${period ? ` — ${period}` : ""}`,
      ["Technicien", "Spécialité", "Total", "Terminées", "En cours", "Planifiées", "Heures"],
      data.map((d) => [
        d.name,
        d.speciality || "—",
        d.totalInterventions.toString(),
        d.completed.toString(),
        d.inProgress.toString(),
        d.planned.toString(),
        `${d.totalHours}h`,
      ]),
    );
  }

  private async buildTechniciansActivityXlsx(
    data: Array<{
      name: string;
      speciality: string;
      totalInterventions: number;
      completed: number;
      inProgress: number;
      planned: number;
      totalHours: number;
    }>,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const period = this.formatPeriodLabel(filters?.startDate, filters?.endDate);
    const ws = wb.addWorksheet("Activité techniciens");
    ws.columns = [
      { key: "name", width: 25 },
      { key: "speciality", width: 20 },
      { key: "total", width: 20 },
      { key: "completed", width: 12 },
      { key: "inProgress", width: 12 },
      { key: "planned", width: 12 },
      { key: "hours", width: 18 },
    ];

    if (period) {
      ws.addRow([`Période : ${period}`]);
      ws.addRow([]);
    }

    this.addStyledHeaderRow(ws, [
      "Technicien",
      "Spécialité",
      "Interventions totales",
      "Terminées",
      "En cours",
      "Planifiées",
      "Heures travaillées",
    ]);

    for (const d of data) {
      ws.addRow({
        name: d.name,
        speciality: d.speciality,
        total: d.totalInterventions,
        completed: d.completed,
        inProgress: d.inProgress,
        planned: d.planned,
        hours: d.totalHours,
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildMileageReportPdf(
    data: Array<{
      teamName: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<Buffer> {
    const period = this.formatPeriodLabel(filters?.startDate, filters?.endDate);
    return this.buildTablePdf(
      `Rapport kilométrique${period ? ` — ${period}` : ""}`,
      ["Équipe", "Interventions", "Distance (km)", "Carburant (L)", "Coût (€)", "CO₂ (kg)"],
      data.map((d) => [
        d.teamName,
        d.interventionCount.toString(),
        d.estimatedKm.toString(),
        d.fuelLiters.toString(),
        d.fuelCostEur.toFixed(2),
        d.co2Kg.toString(),
      ]),
    );
  }

  private async buildMileageReportXlsx(
    data: Array<{
      teamName: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const period = this.formatPeriodLabel(filters?.startDate, filters?.endDate);
    const ws = wb.addWorksheet("Rapport kilométrique");
    ws.columns = [
      { key: "team", width: 25 },
      { key: "count", width: 14 },
      { key: "km", width: 22 },
      { key: "fuel", width: 14 },
      { key: "cost", width: 18 },
      { key: "co2", width: 12 },
    ];

    if (period) {
      ws.addRow([`Période : ${period}`]);
      ws.addRow([]);
    }

    this.addStyledHeaderRow(ws, [
      "Équipe",
      "Interventions",
      "Distance estimée (km)",
      "Carburant (L)",
      "Coût carburant (€)",
      "CO₂ (kg)",
    ]);

    for (const d of data) {
      ws.addRow({
        team: d.teamName,
        count: d.interventionCount,
        km: d.estimatedKm,
        fuel: d.fuelLiters,
        cost: d.fuelCostEur,
        co2: d.co2Kg,
      });
    }

    const totals = data.reduce(
      (acc, d) => ({
        count: acc.count + d.interventionCount,
        km: acc.km + d.estimatedKm,
        fuel: acc.fuel + d.fuelLiters,
        cost: acc.cost + d.fuelCostEur,
        co2: acc.co2 + d.co2Kg,
      }),
      { count: 0, km: 0, fuel: 0, cost: 0, co2: 0 },
    );
    const totRow = ws.addRow({
      team: "TOTAL",
      count: totals.count,
      km: Math.round(totals.km * 10) / 10,
      fuel: Math.round(totals.fuel * 10) / 10,
      cost: Math.round(totals.cost * 100) / 100,
      co2: Math.round(totals.co2 * 10) / 10,
    });
    totRow.font = { bold: true };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private buildTodoCasesPdf(cases: DashboardTodoCaseItem[], todoLabel: string): Promise<Buffer> {
    return this.buildTablePdf(
      `Tâche : ${todoLabel}`,
      ["Dossier", "Statut", "Priorité", "Client", "Échéance"],
      cases.map((c) => [
        c.caseTitle,
        this.translateStatus(c.status),
        this.translatePriority(c.priority),
        c.customerName ?? "—",
        c.dueDate ? this.formatDateFr(c.dueDate) : "—",
      ]),
    );
  }

  private async buildTodoCasesXlsx(
    cases: DashboardTodoCaseItem[],
    todoLabel: string,
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dossiers");
    ws.columns = [
      { key: "title", width: 35 },
      { key: "status", width: 15 },
      { key: "priority", width: 12 },
      { key: "customer", width: 25 },
      { key: "dueDate", width: 14 },
      { key: "createdAt", width: 14 },
    ];
    ws.addRow([`Tâche : ${todoLabel}`]);
    ws.addRow([]);
    this.addStyledHeaderRow(ws, ["Dossier", "Statut", "Priorité", "Client", "Échéance", "Créé le"]);

    for (const c of cases) {
      ws.addRow({
        title: c.caseTitle,
        status: this.translateStatus(c.status),
        priority: this.translatePriority(c.priority),
        customer: c.customerName ?? "",
        dueDate: c.dueDate ? this.formatDateFr(c.dueDate) : "",
        createdAt: c.createdAt ? this.formatDateFr(c.createdAt) : "",
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ── Generic PDF table builder ──

  private buildTablePdf(title: string, headers: string[], rows: string[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        layout: rows[0]?.length > 5 ? "landscape" : "portrait",
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      this.pdfHeader(doc, title);
      doc.y += 10;

      const colCount = headers.length;
      const pageWidth = doc.page.width - 100;
      const colWidth = pageWidth / colCount;
      const startX = 50;

      doc.rect(startX, doc.y, pageWidth, 18).fill("#6d28d9");
      const headerY = doc.y + 5;
      doc.fontSize(8).fillColor("#ffffff");
      headers.forEach((h, i) => {
        doc.text(h, startX + i * colWidth + 4, headerY, { width: colWidth - 8, lineBreak: false });
      });
      doc.y = headerY + 18;

      doc.fillColor("#1e293b");
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
          doc.y = 50;
        }
        const row = rows[rowIdx];
        const rowY = doc.y;
        if (rowIdx % 2 === 0) {
          doc.rect(startX, rowY - 2, pageWidth, 16).fill("#f8fafc");
          doc.fillColor("#1e293b");
        }
        row.forEach((cell, i) => {
          doc.fontSize(8).text(cell, startX + i * colWidth + 4, rowY, {
            width: colWidth - 8,
            lineBreak: false,
          });
        });
        doc.y = rowY + 16;
      }

      doc.y += 10;
      doc.fontSize(8).fillColor("#94a3b8").text(`${rows.length} enregistrement(s)`, 50, doc.y);

      this.pdfFooter(doc);
      doc.end();
    });
  }

  // ── PDF Helpers ──

  private pdfHeader(doc: PDFKit.PDFDocument, subtitle: string): void {
    doc.fontSize(22).fillColor("#6d28d9").text("Syncora", 50, 40);
    doc.fontSize(10).fillColor("#64748b").text(subtitle, 50, 65);
    doc
      .moveTo(50, 85)
      .lineTo(doc.page.width - 50, 85)
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();
    doc.y = 95;
  }

  private pdfFooter(doc: PDFKit.PDFDocument): void {
    const bottomY = doc.page.height - 40;
    doc
      .fontSize(7)
      .fillColor("#94a3b8")
      .text(`Généré le ${this.formatDateTimeFr(new Date().toISOString())} — Syncora`, 50, bottomY, {
        align: "center",
        width: doc.page.width - 100,
      });
  }

  private pdfSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc.y += 8;
    doc.fontSize(12).fillColor("#6d28d9").text(title, 50, doc.y);
    doc
      .moveTo(50, doc.y + 2)
      .lineTo(200, doc.y + 2)
      .strokeColor("#e2e8f0")
      .lineWidth(0.5)
      .stroke();
    doc.y += 5;
  }

  private pdfField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(`${label} :`, 55, doc.y + 3, { continued: true })
      .fillColor("#1e293b")
      .text(` ${value}`);
  }

  // ── Excel Helpers ──

  private styleHeaderRow(ws: ExcelJS.Worksheet): void {
    const headerRow = ws.getRow(ws.rowCount);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
    headerRow.alignment = { vertical: "middle" };
  }

  /**
   * Ajoute une ligne d'en-tête explicite et la stylise. À utiliser quand des lignes
   * de préambule précèdent le tableau : assigner `ws.columns` avec des `header` après
   * coup écrase la 1re ligne et décale le style sur une ligne vide.
   */
  private addStyledHeaderRow(ws: ExcelJS.Worksheet, headers: string[]): void {
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
    headerRow.alignment = { vertical: "middle" };
  }

  // ── Translation helpers ──

  private translateStatus(status: string): string {
    const map: Record<string, string> = {
      draft: "Brouillon",
      open: "Ouvert",
      in_progress: "En cours",
      waiting: "En attente",
      completed: "Terminé",
      cancelled: "Annulé",
    };
    return map[status] ?? status;
  }

  private translatePriority(priority: string): string {
    const map: Record<string, string> = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      urgent: "Urgente",
    };
    return map[priority] ?? priority;
  }

  private translateInterventionStatus(status: string): string {
    const map: Record<string, string> = {
      planned: "Planifiée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    return map[status] ?? status;
  }

  // ── Date/time helpers ──

  private formatDateFr(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  private formatDateTimeFr(iso: string): string {
    try {
      return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  private formatPeriodLabel(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return "";
    if (startDate && endDate)
      return `${this.formatDateFr(startDate)} au ${this.formatDateFr(endDate)}`;
    if (startDate) return `à partir du ${this.formatDateFr(startDate)}`;
    return `jusqu'au ${this.formatDateFr(endDate!)}`;
  }

  // ── Geo helpers ──

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // ── HTTP helper ──

  private async callService<T>(
    baseUrl: string,
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await firstValueFrom(this.httpService.get<T>(`${baseUrl}${path}`, { params }));
    return response.data;
  }
}
