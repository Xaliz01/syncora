import { BadRequestException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  CaseResponse,
  CaseSummaryResponse,
  CasesListResponse,
  CustomerResponse,
  CustomersListResponse,
  DashboardTodoCaseItem,
  ExportFormat,
  ExportInvoicesListParams,
  InterventionResponse,
  InterventionsListResponse,
  OrganizationInvoiceSyncItem,
  OrganizationInvoiceSyncsListResponse,
  ReportCellValue,
  ReportEntityRef,
  ReportPreviewQuery,
  ReportPreviewResponse,
  EntityKind,
  ReportingStatsResponse,
  TeamResponse,
  TechnicianResponse,
  UserResponse,
} from "@planwise/shared";
import {
  MAX_PAGE_LIMIT,
  REMOTE_INVOICE_STATUS_LABELS,
  CASE_INVOICE_KIND_LABELS,
  BILLING_STATUS_LABELS,
  isReportPreviewType,
  parseReportingPeriod,
  reportingPeriodFilenameSuffix,
  ReportingPeriodError,
  type BillingStatus,
} from "@planwise/shared";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { AbstractExportsService, type ExportResult } from "./ports/exports.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const INTEGRATIONS_URL = process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013";

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

    const interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
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
    filters?: {
      status?: string;
      billingStatus?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ExportResult> {
    const query: Record<string, string> = { organizationId };
    if (filters?.status) query.status = filters.status;
    if (filters?.billingStatus) query.billingStatus = filters.billingStatus;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.search) query.search = filters.search;

    let cases = await this.fetchAllPaginated<CaseSummaryResponse>(
      CASES_URL,
      "/cases",
      "cases",
      query,
    );
    const period = this.resolveOptionalReportingPeriod(filters);
    cases = this.filterCasesByPeriod(cases, period?.startDate, period?.endDate);

    if (format === "pdf") {
      const buffer = await this.buildCasesListPdf(cases, period);
      return {
        buffer,
        contentType: "application/pdf",
        filename: this.exportFilename("liste-dossiers", "pdf", period),
      };
    }

    if (format === "csv") {
      const buffer = this.buildCasesListCsv(cases, period);
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: this.exportFilename("liste-dossiers", "csv", period),
      };
    }

    const buffer = await this.buildCasesListXlsx(cases, period);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: this.exportFilename("liste-dossiers", "xlsx", period),
    };
  }

  // ── Users list ──

  async exportUsersList(organizationId: string, format: ExportFormat): Promise<ExportResult> {
    const users = await this.callService<UserResponse[]>(USERS_URL, "/users", { organizationId });

    if (format === "pdf") {
      const buffer = await this.buildUsersListPdf(users);
      return { buffer, contentType: "application/pdf", filename: "liste-utilisateurs.pdf" };
    }

    if (format === "csv") {
      const buffer = this.buildUsersListCsv(users);
      return { buffer, contentType: "text/csv; charset=utf-8", filename: "liste-utilisateurs.csv" };
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

    const customers = await this.fetchAllPaginated<CustomerResponse>(
      CUSTOMERS_URL,
      "/customers",
      "customers",
      query,
    );

    if (format === "pdf") {
      const buffer = await this.buildCustomersListPdf(customers);
      return { buffer, contentType: "application/pdf", filename: "liste-clients.pdf" };
    }

    if (format === "csv") {
      const buffer = this.buildCustomersListCsv(customers);
      return { buffer, contentType: "text/csv; charset=utf-8", filename: "liste-clients.csv" };
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
    const period = this.resolveOptionalReportingPeriod(filters);
    const query: Record<string, string> = {
      organizationId,
      ...this.toServiceDateRange(period),
    };
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.status) query.status = filters.status;

    let interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
      query,
    );

    if (filters?.teamId) {
      interventions = interventions.filter((i) => i.assignedTeamId === filters.teamId);
    }

    const lookups = await this.loadInterventionAssignmentLookups(organizationId);

    if (format === "pdf") {
      const buffer = await this.buildInterventionsListPdf(interventions, period, lookups);
      return {
        buffer,
        contentType: "application/pdf",
        filename: this.exportFilename("liste-interventions", "pdf", period),
      };
    }

    if (format === "csv") {
      const buffer = this.buildInterventionsListCsv(interventions, period, lookups);
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: this.exportFilename("liste-interventions", "csv", period),
      };
    }

    const buffer = await this.buildInterventionsListXlsx(interventions, period, lookups);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: this.exportFilename("liste-interventions", "xlsx", period),
    };
  }

  // ── Technicians activity ──

  async exportTechniciansActivity(
    organizationId: string,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult> {
    const period = this.requireReportingPeriod(filters);
    const [technicians, teams] = await Promise.all([
      this.callService<TechnicianResponse[]>(TECHNICIANS_URL, "/technicians", {
        organizationId,
      }),
      this.callService<TeamResponse[]>(TECHNICIANS_URL, "/teams", {
        organizationId,
      }).catch(() => [] as TeamResponse[]),
    ]);

    const query: Record<string, string> = {
      organizationId,
      ...this.toServiceDateRange(period),
    };

    const interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
      query,
    );

    const filteredTechnicians = filters?.technicianId
      ? technicians.filter((t) => t.id === filters.technicianId)
      : technicians;

    const teamIdsByTechnicianId = new Map<string, string[]>();
    for (const team of teams) {
      for (const technicianId of team.technicianIds ?? []) {
        const existing = teamIdsByTechnicianId.get(technicianId) ?? [];
        existing.push(team.id);
        teamIdsByTechnicianId.set(technicianId, existing);
      }
    }

    const activityData = filteredTechnicians.map((tech) => {
      const teamIds = new Set(teamIdsByTechnicianId.get(tech.id) ?? []);
      const techInterventions = interventions.filter((i) => {
        if (i.assigneeId && (i.assigneeId === tech.userId || i.assigneeId === tech.id)) {
          return true;
        }
        return Boolean(i.assignedTeamId && teamIds.has(i.assignedTeamId));
      });
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
        technicianId: tech.id,
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
      const buffer = await this.buildTechniciansActivityPdf(activityData, period);
      return {
        buffer,
        contentType: "application/pdf",
        filename: this.exportFilename("activite-techniciens", "pdf", period),
      };
    }

    if (format === "csv") {
      const buffer = this.buildTechniciansActivityCsv(activityData, period);
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: this.exportFilename("activite-techniciens", "csv", period),
      };
    }

    const buffer = await this.buildTechniciansActivityXlsx(activityData, period);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: this.exportFilename("activite-techniciens", "xlsx", period),
    };
  }

  // ── Mileage report ──

  async exportMileageReport(
    organizationId: string,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      teamId?: string;
      technicianId?: string;
      groupBy?: "team" | "technician";
    },
  ): Promise<ExportResult> {
    const period = this.requireReportingPeriod(filters);
    const groupBy = filters?.groupBy === "technician" ? "technician" : "team";
    const rows = await this.buildMileageRows(organizationId, period, {
      groupBy,
      teamId: filters?.teamId,
      technicianId: filters?.technicianId,
    });

    if (format === "pdf") {
      const buffer = await this.buildMileageReportPdf(rows, period, groupBy);
      return {
        buffer,
        contentType: "application/pdf",
        filename: this.exportFilename("rapport-kilometrique", "pdf", period),
      };
    }

    if (format === "csv") {
      const buffer = this.buildMileageReportCsv(rows, period, groupBy);
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: this.exportFilename("rapport-kilometrique", "csv", period),
      };
    }

    const buffer = await this.buildMileageReportXlsx(rows, period, groupBy);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: this.exportFilename("rapport-kilometrique", "xlsx", period),
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

    if (format === "csv") {
      const buffer = this.buildTodoCasesCsv(cases);
      return { buffer, contentType: "text/csv; charset=utf-8", filename: "taches-dossiers.csv" };
    }

    const buffer = await this.buildTodoCasesXlsx(cases, params.todoLabel);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: "taches-dossiers.xlsx",
    };
  }

  // ── Invoices list ──

  async exportInvoicesList(
    organizationId: string,
    format: ExportFormat,
    filters?: ExportInvoicesListParams,
  ): Promise<ExportResult> {
    const period = this.resolveOptionalReportingPeriod(filters);
    const query: Record<string, string> = { organizationId };
    if (filters?.remoteStatus) query.remoteStatus = filters.remoteStatus;
    if (filters?.provider) query.provider = filters.provider;
    if (filters?.invoiceKind) query.invoiceKind = filters.invoiceKind;
    if (period) {
      query.startDate = period.startDate;
      query.endDate = period.endDate;
    }

    const invoices = await this.fetchAllPaginated<OrganizationInvoiceSyncItem>(
      INTEGRATIONS_URL,
      "/integrations/invoice-syncs",
      "invoices",
      query,
    );
    const enriched = await this.enrichInvoiceSyncs(organizationId, invoices);

    if (format === "csv") {
      const buffer = this.buildInvoicesListCsv(enriched, period);
      return {
        buffer,
        contentType: "text/csv; charset=utf-8",
        filename: this.exportFilename("liste-factures", "csv", period),
      };
    }

    if (format === "pdf") {
      const buffer = await this.buildInvoicesListPdf(enriched, period);
      return {
        buffer,
        contentType: "application/pdf",
        filename: this.exportFilename("liste-factures", "pdf", period),
      };
    }

    const buffer = await this.buildInvoicesListXlsx(enriched, period);
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: this.exportFilename("liste-factures", "xlsx", period),
    };
  }

  private async enrichInvoiceSyncs(
    organizationId: string,
    invoices: OrganizationInvoiceSyncItem[],
  ): Promise<OrganizationInvoiceSyncItem[]> {
    if (invoices.length === 0) return invoices;

    const caseIds = [...new Set(invoices.map((i) => i.caseId).filter(Boolean))];
    const caseEntries = await Promise.all(
      caseIds.map(async (caseId) => {
        try {
          const caseData = await this.callService<CaseResponse>(CASES_URL, `/cases/${caseId}`, {
            organizationId,
          });
          return [caseId, caseData] as const;
        } catch {
          return null;
        }
      }),
    );

    const caseById = new Map<string, CaseResponse>();
    const customerIds: string[] = [];
    for (const entry of caseEntries) {
      if (!entry) continue;
      const [caseId, caseData] = entry;
      caseById.set(caseId, caseData);
      if (caseData.customerId) customerIds.push(caseData.customerId);
    }

    const uniqueCustomerIds = [...new Set(customerIds)];
    const customerById = new Map<string, CustomerResponse>();
    if (uniqueCustomerIds.length > 0) {
      try {
        const customersPage = await this.callService<CustomersListResponse>(
          CUSTOMERS_URL,
          "/customers",
          {
            organizationId,
            ids: uniqueCustomerIds.join(","),
            limit: String(Math.min(uniqueCustomerIds.length, 200)),
            offset: "0",
          },
        );
        for (const customer of customersPage.customers) {
          customerById.set(customer.id, customer);
        }
      } catch {
        // Enrichissement best-effort : on garde les factures sans client.
      }
    }

    return invoices.map((invoice) => {
      const caseData = caseById.get(invoice.caseId);
      const customer = caseData?.customerId ? customerById.get(caseData.customerId) : undefined;
      return {
        ...invoice,
        caseTitle: caseData?.title ?? invoice.caseTitle,
        customerDisplayName: customer?.displayName ?? invoice.customerDisplayName,
      };
    });
  }

  // ── Reporting preview (tableau in-app) ──

  async previewReport(
    organizationId: string,
    reportType: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    if (!isReportPreviewType(reportType)) {
      throw new BadRequestException(`Type de rapport inconnu : ${reportType}`);
    }

    switch (reportType) {
      case "cases_list":
        return this.previewCasesList(organizationId, filters);
      case "interventions_list":
        return this.previewInterventionsList(organizationId, filters);
      case "technicians_activity":
        return this.previewTechniciansActivity(organizationId, filters);
      case "mileage_report":
        return this.previewMileageReport(organizationId, filters);
      case "customers_list":
        return this.previewCustomersList(organizationId, filters);
      case "users_list":
        return this.previewUsersList(organizationId);
      case "invoices_list":
        return this.previewInvoicesList(organizationId, filters);
      default: {
        const _exhaustive: never = reportType;
        throw new BadRequestException(`Type de rapport non géré : ${_exhaustive}`);
      }
    }
  }

  private ref(
    kind: EntityKind,
    id: string | undefined | null,
    label: string | undefined | null,
  ): ReportCellValue {
    const text = (label ?? "").trim();
    if (id && text) {
      const entity: ReportEntityRef = { kind, id, label: text };
      return entity;
    }
    return text || null;
  }

  /** Résout technicien / équipe même si les noms dénormalisés sont absents ou = id. */
  private async loadInterventionAssignmentLookups(organizationId: string): Promise<{
    techIdByAssigneeKey: Map<string, string>;
    techLabelById: Map<string, string>;
    teamNameById: Map<string, string>;
    userNameById: Map<string, string>;
  }> {
    const [technicians, teams, users] = await Promise.all([
      this.callService<TechnicianResponse[]>(TECHNICIANS_URL, "/technicians", {
        organizationId,
      }).catch(() => [] as TechnicianResponse[]),
      this.callService<TeamResponse[]>(TECHNICIANS_URL, "/teams", { organizationId }).catch(
        () => [] as TeamResponse[],
      ),
      this.callService<UserResponse[]>(USERS_URL, "/users", { organizationId }).catch(
        () => [] as UserResponse[],
      ),
    ]);

    const techIdByAssigneeKey = new Map<string, string>();
    const techLabelById = new Map<string, string>();
    for (const t of technicians) {
      techIdByAssigneeKey.set(t.id, t.id);
      if (t.userId) techIdByAssigneeKey.set(t.userId, t.id);
      const label = `${t.firstName} ${t.lastName}`.trim();
      if (label) techLabelById.set(t.id, label);
    }

    const teamNameById = new Map<string, string>();
    for (const team of teams) {
      if (team.name?.trim()) teamNameById.set(team.id, team.name.trim());
    }

    const userNameById = new Map<string, string>();
    for (const u of users) {
      const label = u.name?.trim() || u.email?.trim() || "";
      if (label) userNameById.set(u.id, label);
    }

    return { techIdByAssigneeKey, techLabelById, teamNameById, userNameById };
  }

  private resolveInterventionTechnician(
    intervention: InterventionResponse,
    lookups: {
      techIdByAssigneeKey: Map<string, string>;
      techLabelById: Map<string, string>;
      userNameById: Map<string, string>;
    },
  ): { id?: string; label: string } {
    const storedRaw = intervention.assigneeName?.trim() ?? "";
    /** Gateway fallback sometimes persists assigneeId as assigneeName. */
    const stored = storedRaw && storedRaw !== intervention.assigneeId ? storedRaw : "";
    const techId = intervention.assigneeId
      ? lookups.techIdByAssigneeKey.get(intervention.assigneeId)
      : undefined;
    const fromTech = techId ? (lookups.techLabelById.get(techId) ?? "") : "";
    const fromUser = intervention.assigneeId
      ? (lookups.userNameById.get(intervention.assigneeId) ?? "")
      : "";
    return {
      id: techId ?? intervention.assigneeId,
      label: fromTech || fromUser || stored,
    };
  }

  private resolveInterventionTeam(
    intervention: InterventionResponse,
    lookups: { teamNameById: Map<string, string> },
  ): { id?: string; label: string } {
    const storedRaw = intervention.assignedTeamName?.trim() ?? "";
    const stored = storedRaw && storedRaw !== intervention.assignedTeamId ? storedRaw : "";
    const fromTeam = intervention.assignedTeamId
      ? (lookups.teamNameById.get(intervention.assignedTeamId) ?? "")
      : "";
    return {
      id: intervention.assignedTeamId,
      label: fromTeam || stored,
    };
  }

  private async previewCasesList(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const query: Record<string, string> = { organizationId };
    if (filters?.status) query.status = filters.status;
    if (filters?.billingStatus) query.billingStatus = filters.billingStatus;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.search) query.search = filters.search;

    let cases = await this.fetchAllPaginated<CaseSummaryResponse>(
      CASES_URL,
      "/cases",
      "cases",
      query,
    );
    const period = this.resolveOptionalReportingPeriod(filters);
    cases = this.filterCasesByPeriod(cases, period?.startDate, period?.endDate);

    const columns = [
      { key: "title", label: "Dossier" },
      { key: "status", label: "Statut" },
      { key: "billingStatus", label: "Facturation" },
      { key: "priority", label: "Priorité" },
      { key: "customer", label: "Client" },
      { key: "progress", label: "Avancement (%)" },
      { key: "interventionCount", label: "Interventions" },
      { key: "dueDate", label: "Échéance" },
      { key: "createdAt", label: "Créé le" },
    ];

    const rows = cases.map((c) => ({
      cells: {
        title: this.ref("case", c.id, c.title),
        status: this.translateStatus(c.status),
        billingStatus: this.translateBillingStatus(c.billingStatus),
        priority: this.translatePriority(c.priority),
        customer: this.ref(
          "customer",
          c.customer?.id ?? c.customerId,
          c.customer?.displayName ?? "",
        ),
        progress: c.progress,
        interventionCount: c.interventionCount,
        dueDate: c.dueDate ? this.formatDateFr(c.dueDate) : null,
        createdAt: c.createdAt ? this.formatDateFr(c.createdAt) : null,
      },
    }));

    return {
      reportType: "cases_list",
      title: "Liste des dossiers",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async previewInterventionsList(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const period = this.resolveOptionalReportingPeriod(filters);
    const query: Record<string, string> = {
      organizationId,
      ...this.toServiceDateRange(period),
    };
    if (filters?.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters?.status) query.status = filters.status;

    let interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
      query,
    );
    if (filters?.teamId) {
      interventions = interventions.filter((i) => i.assignedTeamId === filters.teamId);
    }

    const lookups = await this.loadInterventionAssignmentLookups(organizationId);

    const columns = [
      { key: "title", label: "Titre" },
      { key: "case", label: "Dossier" },
      { key: "status", label: "Statut" },
      { key: "technician", label: "Technicien" },
      { key: "team", label: "Équipe" },
      { key: "scheduledStart", label: "Date planifiée" },
      { key: "startedAt", label: "Démarré" },
      { key: "completedAt", label: "Terminé" },
      { key: "duration", label: "Durée (h)" },
    ];

    const rows = interventions.map((i) => {
      let duration: number | null = null;
      if (i.startedAt && i.completedAt) {
        duration =
          Math.round(
            ((new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 3600000) * 10,
          ) / 10;
      }
      const technician = this.resolveInterventionTechnician(i, lookups);
      const team = this.resolveInterventionTeam(i, lookups);
      return {
        cells: {
          title: i.title,
          case: this.ref("case", i.caseId, i.caseTitle ?? i.caseId),
          status: this.translateInterventionStatus(i.status),
          technician: this.ref("technician", technician.id, technician.label),
          team: this.ref("team", team.id, team.label),
          scheduledStart: i.scheduledStart ? this.formatDateTimeFr(i.scheduledStart) : null,
          startedAt: i.startedAt ? this.formatDateTimeFr(i.startedAt) : null,
          completedAt: i.completedAt ? this.formatDateTimeFr(i.completedAt) : null,
          duration,
        },
      };
    });

    return {
      reportType: "interventions_list",
      title: "Liste des interventions",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async previewTechniciansActivity(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const period = this.requireReportingPeriod(filters);
    const [technicians, teams] = await Promise.all([
      this.callService<TechnicianResponse[]>(TECHNICIANS_URL, "/technicians", { organizationId }),
      this.callService<TeamResponse[]>(TECHNICIANS_URL, "/teams", { organizationId }).catch(
        () => [] as TeamResponse[],
      ),
    ]);
    const interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
      { organizationId, ...this.toServiceDateRange(period) },
    );
    const filteredTechnicians = filters?.technicianId
      ? technicians.filter((t) => t.id === filters.technicianId)
      : technicians;
    const teamIdsByTechnicianId = new Map<string, string[]>();
    for (const team of teams) {
      for (const technicianId of team.technicianIds ?? []) {
        const existing = teamIdsByTechnicianId.get(technicianId) ?? [];
        existing.push(team.id);
        teamIdsByTechnicianId.set(technicianId, existing);
      }
    }

    const columns = [
      { key: "technician", label: "Technicien" },
      { key: "speciality", label: "Spécialité" },
      { key: "totalInterventions", label: "Interventions totales" },
      { key: "completed", label: "Terminées" },
      { key: "inProgress", label: "En cours" },
      { key: "planned", label: "Planifiées" },
      { key: "totalHours", label: "Heures travaillées" },
    ];

    const rows = filteredTechnicians.map((tech) => {
      const teamIds = new Set(teamIdsByTechnicianId.get(tech.id) ?? []);
      const techInterventions = interventions.filter((i) => {
        if (i.assigneeId && (i.assigneeId === tech.userId || i.assigneeId === tech.id)) {
          return true;
        }
        return Boolean(i.assignedTeamId && teamIds.has(i.assignedTeamId));
      });
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
        cells: {
          technician: this.ref("technician", tech.id, `${tech.firstName} ${tech.lastName}`),
          speciality: tech.speciality ?? null,
          totalInterventions: techInterventions.length,
          completed: completed.length,
          inProgress: techInterventions.filter((i) => i.status === "in_progress").length,
          planned: techInterventions.filter((i) => i.status === "planned").length,
          totalHours: Math.round(totalHours * 10) / 10,
        },
      };
    });

    return {
      reportType: "technicians_activity",
      title: "Activité techniciens",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async previewMileageReport(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const period = this.requireReportingPeriod(filters);
    const groupBy = filters?.groupBy === "technician" ? "technician" : "team";
    const mileageRows = await this.buildMileageRows(organizationId, period, {
      groupBy,
      teamId: filters?.teamId,
      technicianId: filters?.technicianId,
    });

    const subjectKey = groupBy === "technician" ? "technician" : "team";
    const subjectLabel = groupBy === "technician" ? "Technicien" : "Équipe";
    const columns = [
      { key: subjectKey, label: subjectLabel },
      { key: "interventionCount", label: "Interventions" },
      { key: "estimatedKm", label: "Distance estimée (km)" },
      { key: "fuelLiters", label: "Carburant (L)" },
      { key: "fuelCostEur", label: "Coût carburant (€)" },
      { key: "co2Kg", label: "CO₂ (kg)" },
    ];

    const rows = mileageRows.map((row) => ({
      cells: {
        [subjectKey]:
          groupBy === "technician"
            ? this.ref("technician", row.subjectId, row.subjectLabel)
            : this.ref("team", row.subjectId, row.subjectLabel),
        interventionCount: row.interventionCount,
        estimatedKm: row.estimatedKm,
        fuelLiters: row.fuelLiters,
        fuelCostEur: row.fuelCostEur,
        co2Kg: row.co2Kg,
      },
    }));

    return {
      reportType: "mileage_report",
      title: "Rapport kilométrique",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async buildMileageRows(
    organizationId: string,
    period: { startDate: string; endDate: string },
    filters: {
      groupBy: "team" | "technician";
      teamId?: string;
      technicianId?: string;
    },
  ): Promise<
    Array<{
      subjectId: string;
      subjectLabel: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>
  > {
    const interventions = await this.fetchAllPaginated<InterventionResponse>(
      CASES_URL,
      "/interventions",
      "interventions",
      { organizationId, ...this.toServiceDateRange(period) },
    );

    const completedWithLocations = interventions.filter(
      (i) => i.status === "completed" && i.startLocation && i.endLocation,
    );

    if (filters.groupBy === "technician") {
      const technicians = await this.callService<TechnicianResponse[]>(
        TECHNICIANS_URL,
        "/technicians",
        { organizationId },
      ).catch(() => [] as TechnicianResponse[]);

      return technicians
        .filter((t) => !filters.technicianId || t.id === filters.technicianId)
        .map((tech) => {
          const techInterventions = completedWithLocations.filter(
            (i) =>
              Boolean(i.assigneeId) && (i.assigneeId === tech.id || i.assigneeId === tech.userId),
          );
          return this.toMileageRow(
            tech.id,
            `${tech.firstName} ${tech.lastName}`.trim(),
            techInterventions,
          );
        });
    }

    const teams = await this.callService<TeamResponse[]>(TECHNICIANS_URL, "/teams", {
      organizationId,
    });
    const filteredInterventions = filters.teamId
      ? completedWithLocations.filter((i) => i.assignedTeamId === filters.teamId)
      : completedWithLocations;

    return teams
      .filter((t) => !filters.teamId || t.id === filters.teamId)
      .map((team) => {
        const teamInterventions = filteredInterventions.filter((i) => i.assignedTeamId === team.id);
        return this.toMileageRow(team.id, team.name, teamInterventions);
      });
  }

  private toMileageRow(
    subjectId: string,
    subjectLabel: string,
    interventions: InterventionResponse[],
  ): {
    subjectId: string;
    subjectLabel: string;
    interventionCount: number;
    estimatedKm: number;
    fuelLiters: number;
    fuelCostEur: number;
    co2Kg: number;
  } {
    const estimatedKm = interventions.reduce((sum, i) => {
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
      subjectId,
      subjectLabel,
      interventionCount: interventions.length,
      estimatedKm: Math.round(estimatedKm * 10) / 10,
      fuelLiters: Math.round(estimatedKm * 0.082 * 10) / 10,
      fuelCostEur: Math.round(estimatedKm * 0.082 * 1.75 * 100) / 100,
      co2Kg: Math.round(estimatedKm * 0.082 * 2.65 * 10) / 10,
    };
  }

  private async previewCustomersList(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const query: Record<string, string> = { organizationId };
    if (filters?.search) query.search = filters.search;
    if (filters?.kind) query.kind = filters.kind;
    const customers = await this.fetchAllPaginated<CustomerResponse>(
      CUSTOMERS_URL,
      "/customers",
      "customers",
      query,
    );
    const columns = [
      { key: "name", label: "Nom" },
      { key: "kind", label: "Type" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Téléphone" },
      { key: "mobile", label: "Mobile" },
      { key: "city", label: "Ville" },
      { key: "postalCode", label: "Code postal" },
    ];
    const rows = customers.map((c) => ({
      cells: {
        name: this.ref("customer", c.id, c.displayName),
        kind: c.kind === "individual" ? "Particulier" : "Société",
        email: c.email ?? null,
        phone: c.phone ?? null,
        mobile: c.mobile ?? null,
        city: c.address?.city ?? null,
        postalCode: c.address?.postalCode ?? null,
      },
    }));
    return {
      reportType: "customers_list",
      title: "Liste des clients",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async previewUsersList(organizationId: string): Promise<ReportPreviewResponse> {
    const users = await this.callService<UserResponse[]>(USERS_URL, "/users", { organizationId });
    const columns = [
      { key: "name", label: "Nom" },
      { key: "email", label: "Email" },
      { key: "role", label: "Rôle" },
      { key: "status", label: "Statut" },
    ];
    const rows = users.map((u) => ({
      cells: {
        name: this.ref("user", u.id, u.name ?? u.email),
        email: u.email,
        role: u.role === "admin" ? "Administrateur" : "Membre",
        status: u.status === "active" ? "Actif" : "Invité",
      },
    }));
    return {
      reportType: "users_list",
      title: "Liste des utilisateurs",
      columns,
      rows,
      total: rows.length,
    };
  }

  private async previewInvoicesList(
    organizationId: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    const period = this.resolveOptionalReportingPeriod(filters);
    const query: Record<string, string> = { organizationId };
    if (filters?.remoteStatus) query.remoteStatus = filters.remoteStatus;
    if (filters?.provider) query.provider = filters.provider;
    if (filters?.invoiceKind) query.invoiceKind = filters.invoiceKind;
    if (period) {
      query.startDate = period.startDate;
      query.endDate = period.endDate;
    }
    const invoices = await this.fetchAllPaginated<OrganizationInvoiceSyncItem>(
      INTEGRATIONS_URL,
      "/integrations/invoice-syncs",
      "invoices",
      query,
    );
    const enriched = await this.enrichInvoiceSyncs(organizationId, invoices);

    // Resolve customerId via cases for links.
    const caseIds = [...new Set(enriched.map((i) => i.caseId).filter(Boolean))];
    const caseCustomer = new Map<string, { customerId?: string; title?: string }>();
    await Promise.all(
      caseIds.map(async (caseId) => {
        try {
          const caseData = await this.callService<CaseResponse>(CASES_URL, `/cases/${caseId}`, {
            organizationId,
          });
          caseCustomer.set(caseId, {
            customerId: caseData.customerId,
            title: caseData.title,
          });
        } catch {
          /* ignore */
        }
      }),
    );

    const columns = [
      { key: "date", label: "Date" },
      { key: "number", label: "Numéro" },
      { key: "case", label: "Dossier" },
      { key: "customer", label: "Client" },
      { key: "kind", label: "Type" },
      { key: "amountHt", label: "Montant HT" },
      { key: "status", label: "Statut" },
      { key: "provider", label: "Fournisseur" },
    ];

    const rows = enriched.map((invoice) => {
      const meta = caseCustomer.get(invoice.caseId);
      return {
        cells: {
          date: invoice.createdAt ? this.formatDateFr(invoice.createdAt) : null,
          number: invoice.invoiceNumber ?? null,
          case: this.ref(
            "case",
            invoice.caseId,
            invoice.caseTitle ?? meta?.title ?? invoice.caseId,
          ),
          customer: this.ref("customer", meta?.customerId, invoice.customerDisplayName ?? ""),
          kind: CASE_INVOICE_KIND_LABELS[invoice.invoiceKind] ?? invoice.invoiceKind,
          amountHt: invoice.amountHt ?? null,
          status: REMOTE_INVOICE_STATUS_LABELS[invoice.remoteStatus] ?? invoice.remoteStatus,
          provider: this.translateProvider(invoice.provider),
        },
      };
    });

    return {
      reportType: "invoices_list",
      title: "Liste des factures",
      columns,
      rows,
      total: rows.length,
    };
  }

  // ── Reporting stats ──

  async getReportingStats(
    organizationId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<ReportingStatsResponse> {
    const period = this.requireReportingPeriod(filters);
    const interventionQuery: Record<string, string> = {
      organizationId,
      ...this.toServiceDateRange(period),
    };

    const [casesResult, interventionsResult, techniciansResult, customersResult] =
      await Promise.allSettled([
        this.fetchAllPaginated<CaseSummaryResponse>(CASES_URL, "/cases", "cases", {
          organizationId,
        }),
        this.fetchAllPaginated<InterventionResponse>(
          CASES_URL,
          "/interventions",
          "interventions",
          interventionQuery,
        ),
        this.callService<TechnicianResponse[]>(TECHNICIANS_URL, "/technicians", {
          organizationId,
        }),
        this.fetchAllPaginated<CustomerResponse>(CUSTOMERS_URL, "/customers", "customers", {
          organizationId,
        }),
      ]);

    const allCases = casesResult.status === "fulfilled" ? casesResult.value : [];
    const interventions =
      interventionsResult.status === "fulfilled" ? interventionsResult.value : [];
    const technicians = techniciansResult.status === "fulfilled" ? techniciansResult.value : [];
    const customers = customersResult.status === "fulfilled" ? customersResult.value : [];

    const cases = this.filterCasesByPeriod(allCases, period.startDate, period.endDate);

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
      casesBillingToInvoice: cases.filter((c) => c.billingStatus === "to_invoice").length,
      casesBillingDraft: cases.filter((c) => c.billingStatus === "invoice_draft").length,
      casesBillingPartiallyInvoiced: cases.filter((c) => c.billingStatus === "partially_invoiced")
        .length,
      casesBillingInvoiced: cases.filter((c) => c.billingStatus === "invoiced").length,
      casesBillingPaid: cases.filter((c) => c.billingStatus === "paid").length,
    };
  }

  private filterCasesByPeriod(
    cases: CaseSummaryResponse[],
    startDate?: string,
    endDate?: string,
  ): CaseSummaryResponse[] {
    if (!startDate && !endDate) return cases;
    const startMs = startDate != null ? this.periodBoundMs(startDate, false) : null;
    const endMs = endDate != null ? this.periodBoundMs(endDate, true) : null;
    return cases.filter((c) => {
      if (!c.createdAt) return false;
      const t = new Date(c.createdAt).getTime();
      if (startMs != null && t < startMs) return false;
      if (endMs != null && t > endMs) return false;
      return true;
    });
  }

  private periodBoundMs(date: string, endOfDay: boolean): number {
    if (date.includes("T")) return new Date(date).getTime();
    return new Date(endOfDay ? `${date}T23:59:59.999` : `${date}T00:00:00.000`).getTime();
  }

  /** Normalize YYYY-MM-DD period bounds for downstream date filters. */
  private toServiceDateRange(filters?: { startDate?: string; endDate?: string }): {
    startDate?: string;
    endDate?: string;
  } {
    const range: { startDate?: string; endDate?: string } = {};
    if (filters?.startDate) {
      range.startDate = filters.startDate.includes("T")
        ? filters.startDate
        : `${filters.startDate}T00:00:00.000`;
    }
    if (filters?.endDate) {
      range.endDate = filters.endDate.includes("T")
        ? filters.endDate
        : `${filters.endDate}T23:59:59.999`;
    }
    return range;
  }

  // ── PDF Builders ──

  private buildCaseSummaryPdf(
    caseData: CaseResponse,
    customer: CustomerResponse | undefined,
    interventions: InterventionResponse[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
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
          if (doc.y > doc.page.height - 70) doc.addPage();
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

  private buildCasesListPdf(
    cases: CaseSummaryResponse[],
    period?: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildTablePdf(
      `Liste des dossiers${periodLabel ? ` — ${periodLabel}` : ""}`,
      ["Dossier", "Statut", "Facturation", "Priorité", "Avancement", "Échéance"],
      cases.map((c) => [
        c.title,
        this.translateStatus(c.status),
        this.translateBillingStatus(c.billingStatus),
        this.translatePriority(c.priority),
        `${c.progress}%`,
        c.dueDate ? this.formatDateFr(c.dueDate) : "—",
      ]),
    );
  }

  private async buildCasesListXlsx(
    cases: CaseSummaryResponse[],
    period?: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dossiers");
    ws.columns = [
      { key: "title", width: 35 },
      { key: "status", width: 15 },
      { key: "billingStatus", width: 18 },
      { key: "priority", width: 12 },
      { key: "customer", width: 25 },
      { key: "progress", width: 12 },
      { key: "interventions", width: 14 },
      { key: "dueDate", width: 14 },
      { key: "createdAt", width: 14 },
    ];

    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    if (periodLabel) {
      ws.addRow([`Période : ${periodLabel}`]);
      ws.addRow([]);
    }

    this.addStyledHeaderRow(ws, [
      "Dossier",
      "Statut",
      "Facturation",
      "Priorité",
      "Client",
      "Avancement",
      "Interventions",
      "Échéance",
      "Créé le",
    ]);

    for (const c of cases) {
      ws.addRow({
        title: c.title,
        status: this.translateStatus(c.status),
        billingStatus: this.translateBillingStatus(c.billingStatus),
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

  private buildInterventionsListPdf(
    interventions: InterventionResponse[],
    period: { startDate: string; endDate: string } | undefined,
    lookups: {
      techIdByAssigneeKey: Map<string, string>;
      techLabelById: Map<string, string>;
      teamNameById: Map<string, string>;
      userNameById: Map<string, string>;
    },
  ): Promise<Buffer> {
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildTablePdf(
      `Liste des interventions${periodLabel ? ` — ${periodLabel}` : ""}`,
      ["Titre", "Dossier", "Statut", "Technicien", "Équipe", "Date"],
      interventions.map((i) => {
        const technician = this.resolveInterventionTechnician(i, lookups);
        const team = this.resolveInterventionTeam(i, lookups);
        return [
          i.title,
          i.caseTitle ?? "—",
          this.translateInterventionStatus(i.status),
          technician.label || "—",
          team.label || "—",
          i.scheduledStart ? this.formatDateFr(i.scheduledStart) : "—",
        ];
      }),
    );
  }

  private async buildInterventionsListXlsx(
    interventions: InterventionResponse[],
    period: { startDate: string; endDate: string } | undefined,
    lookups: {
      techIdByAssigneeKey: Map<string, string>;
      techLabelById: Map<string, string>;
      teamNameById: Map<string, string>;
      userNameById: Map<string, string>;
    },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Interventions");
    ws.columns = [
      { key: "title", width: 30 },
      { key: "caseTitle", width: 25 },
      { key: "status", width: 14 },
      { key: "assignee", width: 20 },
      { key: "team", width: 18 },
      { key: "scheduledStart", width: 16 },
      { key: "startedAt", width: 16 },
      { key: "completedAt", width: 16 },
      { key: "duration", width: 10 },
    ];

    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    if (periodLabel) {
      ws.addRow([`Période : ${periodLabel}`]);
      ws.addRow([]);
    }

    this.addStyledHeaderRow(ws, [
      "Titre",
      "Dossier",
      "Statut",
      "Technicien",
      "Équipe",
      "Date planifiée",
      "Démarré",
      "Terminé",
      "Durée (h)",
    ]);

    for (const i of interventions) {
      let duration = "";
      if (i.startedAt && i.completedAt) {
        const h = (new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 3600000;
        duration = (Math.round(h * 10) / 10).toString();
      }
      const technician = this.resolveInterventionTechnician(i, lookups);
      const team = this.resolveInterventionTeam(i, lookups);
      ws.addRow({
        title: i.title,
        caseTitle: i.caseTitle ?? "",
        status: this.translateInterventionStatus(i.status),
        assignee: technician.label,
        team: team.label,
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
    period: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const periodLabel = this.formatPeriodLabel(period.startDate, period.endDate);
    return this.buildTablePdf(
      `Activité techniciens — ${periodLabel}`,
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
    period: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const periodLabel = this.formatPeriodLabel(period.startDate, period.endDate);
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

    ws.addRow([`Période : ${periodLabel}`]);
    ws.addRow([]);

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
      subjectLabel: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>,
    period: { startDate: string; endDate: string },
    groupBy: "team" | "technician",
  ): Promise<Buffer> {
    const periodLabel = this.formatPeriodLabel(period.startDate, period.endDate);
    const subjectHeader = groupBy === "technician" ? "Technicien" : "Équipe";
    return this.buildTablePdf(
      `Rapport kilométrique — ${periodLabel}`,
      [subjectHeader, "Interventions", "Distance (km)", "Carburant (L)", "Coût (€)", "CO₂ (kg)"],
      data.map((d) => [
        d.subjectLabel,
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
      subjectLabel: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>,
    period: { startDate: string; endDate: string },
    groupBy: "team" | "technician",
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const periodLabel = this.formatPeriodLabel(period.startDate, period.endDate);
    const ws = wb.addWorksheet("Rapport kilométrique");
    ws.columns = [
      { key: "subject", width: 25 },
      { key: "count", width: 14 },
      { key: "km", width: 22 },
      { key: "fuel", width: 14 },
      { key: "cost", width: 18 },
      { key: "co2", width: 12 },
    ];

    ws.addRow([`Période : ${periodLabel}`]);
    ws.addRow([]);

    const subjectHeader = groupBy === "technician" ? "Technicien" : "Équipe";
    this.addStyledHeaderRow(ws, [
      subjectHeader,
      "Interventions",
      "Distance estimée (km)",
      "Carburant (L)",
      "Coût carburant (€)",
      "CO₂ (kg)",
    ]);

    for (const d of data) {
      ws.addRow({
        subject: d.subjectLabel,
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

    ws.addRow({
      subject: "TOTAL",
      count: totals.count,
      km: Math.round(totals.km * 10) / 10,
      fuel: Math.round(totals.fuel * 10) / 10,
      cost: Math.round(totals.cost * 100) / 100,
      co2: Math.round(totals.co2 * 10) / 10,
    });

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

  // ── CSV Builders ──

  private buildCsvBuffer(
    headers: string[],
    rows: string[][],
    options?: { periodLabel?: string },
  ): Buffer {
    const escape = (val: string) => {
      if (val.includes('"') || val.includes(",") || val.includes("\n") || val.includes(";")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const lines: string[] = [];
    if (options?.periodLabel) {
      lines.push(["Période", options.periodLabel].map(escape).join(";"));
      lines.push("");
    }
    lines.push(headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";")));
    const bom = "\uFEFF";
    return Buffer.from(bom + lines.join("\r\n"), "utf-8");
  }

  private buildInvoicesListCsv(
    invoices: OrganizationInvoiceSyncItem[],
    period?: { startDate: string; endDate: string },
  ): Buffer {
    const headers = [
      "Date",
      "Numéro",
      "Dossier",
      "Client",
      "Type",
      "Montant HT",
      "Statut",
      "Fournisseur",
      "Lien",
    ];
    const rows = invoices.map((invoice) => [
      invoice.createdAt ? this.formatDateFr(invoice.createdAt) : "",
      invoice.invoiceNumber ?? "",
      invoice.caseTitle ?? invoice.caseId,
      invoice.customerDisplayName ?? "",
      CASE_INVOICE_KIND_LABELS[invoice.invoiceKind] ?? invoice.invoiceKind,
      invoice.amountHt ?? "",
      REMOTE_INVOICE_STATUS_LABELS[invoice.remoteStatus] ?? invoice.remoteStatus,
      this.translateProvider(invoice.provider),
      invoice.invoiceUrl ?? "",
    ]);
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildCsvBuffer(headers, rows, periodLabel ? { periodLabel } : undefined);
  }

  private buildInvoicesListPdf(
    invoices: OrganizationInvoiceSyncItem[],
    period?: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildTablePdf(
      `Liste des factures${periodLabel ? ` — ${periodLabel}` : ""}`,
      ["Date", "Numéro", "Dossier", "Client", "Type", "HT", "Statut", "Fournisseur"],
      invoices.map((invoice) => [
        invoice.createdAt ? this.formatDateFr(invoice.createdAt) : "—",
        invoice.invoiceNumber ?? "—",
        invoice.caseTitle ?? invoice.caseId,
        invoice.customerDisplayName ?? "—",
        CASE_INVOICE_KIND_LABELS[invoice.invoiceKind] ?? invoice.invoiceKind,
        invoice.amountHt ?? "—",
        REMOTE_INVOICE_STATUS_LABELS[invoice.remoteStatus] ?? invoice.remoteStatus,
        this.translateProvider(invoice.provider),
      ]),
    );
  }

  private async buildInvoicesListXlsx(
    invoices: OrganizationInvoiceSyncItem[],
    period?: { startDate: string; endDate: string },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Factures");
    ws.columns = [
      { key: "date", width: 14 },
      { key: "number", width: 16 },
      { key: "caseTitle", width: 30 },
      { key: "customer", width: 25 },
      { key: "kind", width: 18 },
      { key: "amountHt", width: 14 },
      { key: "status", width: 14 },
      { key: "provider", width: 14 },
      { key: "url", width: 40 },
    ];

    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    if (periodLabel) {
      ws.addRow([`Période : ${periodLabel}`]);
      ws.addRow([]);
    }

    this.addStyledHeaderRow(ws, [
      "Date",
      "Numéro",
      "Dossier",
      "Client",
      "Type",
      "Montant HT",
      "Statut",
      "Fournisseur",
      "Lien",
    ]);

    for (const invoice of invoices) {
      ws.addRow({
        date: invoice.createdAt ? this.formatDateFr(invoice.createdAt) : "",
        number: invoice.invoiceNumber ?? "",
        caseTitle: invoice.caseTitle ?? invoice.caseId,
        customer: invoice.customerDisplayName ?? "",
        kind: CASE_INVOICE_KIND_LABELS[invoice.invoiceKind] ?? invoice.invoiceKind,
        amountHt: invoice.amountHt ?? "",
        status: REMOTE_INVOICE_STATUS_LABELS[invoice.remoteStatus] ?? invoice.remoteStatus,
        provider: this.translateProvider(invoice.provider),
        url: invoice.invoiceUrl ?? "",
      });
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  private translateProvider(provider: string): string {
    if (provider === "pennylane") return "Pennylane";
    if (provider === "qonto") return "Qonto";
    return provider;
  }

  private buildCasesListCsv(
    cases: CaseSummaryResponse[],
    period?: { startDate: string; endDate: string },
  ): Buffer {
    const headers = [
      "Dossier",
      "Statut",
      "Facturation",
      "Priorité",
      "Client",
      "Avancement (%)",
      "Interventions",
      "Échéance",
      "Créé le",
    ];
    const rows = cases.map((c) => [
      c.title,
      this.translateStatus(c.status),
      this.translateBillingStatus(c.billingStatus),
      this.translatePriority(c.priority),
      c.customer?.displayName ?? "",
      c.progress.toString(),
      c.interventionCount.toString(),
      c.dueDate ? this.formatDateFr(c.dueDate) : "",
      c.createdAt ? this.formatDateFr(c.createdAt) : "",
    ]);
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildCsvBuffer(headers, rows, periodLabel ? { periodLabel } : undefined);
  }

  private buildUsersListCsv(users: UserResponse[]): Buffer {
    const headers = ["Nom", "Email", "Rôle", "Statut"];
    const rows = users.map((u) => [
      u.name ?? "",
      u.email,
      u.role === "admin" ? "Administrateur" : "Membre",
      u.status === "active" ? "Actif" : "Invité",
    ]);
    return this.buildCsvBuffer(headers, rows);
  }

  private buildCustomersListCsv(customers: CustomerResponse[]): Buffer {
    const headers = ["Nom", "Type", "Email", "Téléphone", "Mobile", "Ville", "Code postal"];
    const rows = customers.map((c) => [
      c.displayName,
      c.kind === "individual" ? "Particulier" : "Société",
      c.email ?? "",
      c.phone ?? "",
      c.mobile ?? "",
      c.address?.city ?? "",
      c.address?.postalCode ?? "",
    ]);
    return this.buildCsvBuffer(headers, rows);
  }

  private buildInterventionsListCsv(
    interventions: InterventionResponse[],
    period: { startDate: string; endDate: string } | undefined,
    lookups: {
      techIdByAssigneeKey: Map<string, string>;
      techLabelById: Map<string, string>;
      teamNameById: Map<string, string>;
      userNameById: Map<string, string>;
    },
  ): Buffer {
    const headers = [
      "Titre",
      "Dossier",
      "Statut",
      "Technicien",
      "Équipe",
      "Date planifiée",
      "Démarré",
      "Terminé",
      "Durée (h)",
    ];
    const rows = interventions.map((i) => {
      let duration = "";
      if (i.startedAt && i.completedAt) {
        const h = (new Date(i.completedAt).getTime() - new Date(i.startedAt).getTime()) / 3600000;
        duration = (Math.round(h * 10) / 10).toString();
      }
      const technician = this.resolveInterventionTechnician(i, lookups);
      const team = this.resolveInterventionTeam(i, lookups);
      return [
        i.title,
        i.caseTitle ?? "",
        this.translateInterventionStatus(i.status),
        technician.label,
        team.label,
        i.scheduledStart ? this.formatDateTimeFr(i.scheduledStart) : "",
        i.startedAt ? this.formatDateTimeFr(i.startedAt) : "",
        i.completedAt ? this.formatDateTimeFr(i.completedAt) : "",
        duration,
      ];
    });
    const periodLabel = period ? this.formatPeriodLabel(period.startDate, period.endDate) : "";
    return this.buildCsvBuffer(headers, rows, periodLabel ? { periodLabel } : undefined);
  }

  private buildTechniciansActivityCsv(
    data: Array<{
      name: string;
      speciality: string;
      totalInterventions: number;
      completed: number;
      inProgress: number;
      planned: number;
      totalHours: number;
    }>,
    period: { startDate: string; endDate: string },
  ): Buffer {
    const headers = [
      "Technicien",
      "Spécialité",
      "Interventions totales",
      "Terminées",
      "En cours",
      "Planifiées",
      "Heures travaillées",
    ];
    const rows = data.map((d) => [
      d.name,
      d.speciality,
      d.totalInterventions.toString(),
      d.completed.toString(),
      d.inProgress.toString(),
      d.planned.toString(),
      d.totalHours.toString(),
    ]);
    return this.buildCsvBuffer(headers, rows, {
      periodLabel: this.formatPeriodLabel(period.startDate, period.endDate),
    });
  }

  private buildMileageReportCsv(
    data: Array<{
      subjectLabel: string;
      interventionCount: number;
      estimatedKm: number;
      fuelLiters: number;
      fuelCostEur: number;
      co2Kg: number;
    }>,
    period: { startDate: string; endDate: string },
    groupBy: "team" | "technician",
  ): Buffer {
    const subjectHeader = groupBy === "technician" ? "Technicien" : "Équipe";
    const headers = [
      subjectHeader,
      "Interventions",
      "Distance estimée (km)",
      "Carburant (L)",
      "Coût carburant (€)",
      "CO₂ (kg)",
    ];
    const rows = data.map((d) => [
      d.subjectLabel,
      d.interventionCount.toString(),
      d.estimatedKm.toString(),
      d.fuelLiters.toString(),
      d.fuelCostEur.toFixed(2),
      d.co2Kg.toString(),
    ]);
    return this.buildCsvBuffer(headers, rows, {
      periodLabel: this.formatPeriodLabel(period.startDate, period.endDate),
    });
  }

  private buildTodoCasesCsv(cases: DashboardTodoCaseItem[]): Buffer {
    const headers = ["Dossier", "Statut", "Priorité", "Client", "Échéance", "Créé le"];
    const rows = cases.map((c) => [
      c.caseTitle,
      this.translateStatus(c.status),
      this.translatePriority(c.priority),
      c.customerName ?? "",
      c.dueDate ? this.formatDateFr(c.dueDate) : "",
      c.createdAt ? this.formatDateFr(c.createdAt) : "",
    ]);
    return this.buildCsvBuffer(headers, rows);
  }

  // ── Generic PDF table builder ──

  private buildTablePdf(title: string, headers: string[], rows: string[][]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        bufferPages: true,
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
      const cellPadX = 4;
      const cellPadY = 4;
      const minRowHeight = 18;
      const contentBottom = () => doc.page.height - 70;

      doc.rect(startX, doc.y, pageWidth, 20).fill("#6d28d9");
      const headerY = doc.y + 6;
      doc.fontSize(8).fillColor("#ffffff");
      headers.forEach((h, i) => {
        doc.text(h, startX + i * colWidth + cellPadX, headerY, {
          width: colWidth - cellPadX * 2,
          lineBreak: false,
        });
      });
      doc.y = headerY + 16;

      doc.fillColor("#1e293b");
      rows.forEach((row, rowIndex) => {
        const cellHeights = row.map((cell) =>
          Math.max(
            minRowHeight,
            doc.heightOfString(String(cell ?? ""), {
              width: colWidth - cellPadX * 2,
            }) +
              cellPadY * 2,
          ),
        );
        const rowHeight = Math.max(...cellHeights, minRowHeight);

        if (doc.y + rowHeight > contentBottom()) {
          doc.addPage();
          doc.y = 50;
          doc.rect(startX, doc.y, pageWidth, 20).fill("#6d28d9");
          const hY = doc.y + 6;
          doc.fontSize(8).fillColor("#ffffff");
          headers.forEach((h, i) => {
            doc.text(h, startX + i * colWidth + cellPadX, hY, {
              width: colWidth - cellPadX * 2,
              lineBreak: false,
            });
          });
          doc.y = hY + 16;
          doc.fillColor("#1e293b");
        }

        if (rowIndex % 2 === 0) {
          doc.rect(startX, doc.y, pageWidth, rowHeight).fill("#f8fafc");
          doc.fillColor("#1e293b");
        }

        const rowY = doc.y + cellPadY;
        doc.fontSize(8);
        row.forEach((cell, i) => {
          doc.text(String(cell ?? ""), startX + i * colWidth + cellPadX, rowY, {
            width: colWidth - cellPadX * 2,
          });
        });
        doc.y += rowHeight;
      });

      if (doc.y + 20 > contentBottom()) {
        doc.addPage();
        doc.y = 50;
      }
      doc.y += 10;
      doc.fontSize(8).fillColor("#94a3b8").text(`${rows.length} enregistrement(s)`, 50, doc.y);

      this.pdfFooter(doc);
      doc.end();
    });
  }

  // ── PDF Helpers ──

  private pdfHeader(doc: PDFKit.PDFDocument, subtitle: string): void {
    doc.fontSize(22).fillColor("#6d28d9").text("Planwise", 50, 40);
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
    const label = `Généré le ${this.formatDateTimeFr(new Date().toISOString())} — Planwise`;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Éviter un addPage auto si le texte est sous margin.bottom.
      const margins = doc.page.margins;
      const prevBottom = margins.bottom;
      margins.bottom = 0;
      try {
        const lineY = doc.page.height - 44;
        const textY = doc.page.height - 36;
        doc
          .moveTo(50, lineY)
          .lineTo(doc.page.width - 50, lineY)
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(7)
          .fillColor("#94a3b8")
          .text(label, 50, textY, {
            align: "center",
            width: doc.page.width - 100,
            lineBreak: false,
          });
      } finally {
        margins.bottom = prevBottom;
      }
    }
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

  private translateBillingStatus(status: string | undefined): string {
    if (!status || status === "none") return "—";
    return BILLING_STATUS_LABELS[status as BillingStatus] ?? status;
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

  private requireReportingPeriod(filters?: { startDate?: string; endDate?: string }): {
    startDate: string;
    endDate: string;
  } {
    try {
      return parseReportingPeriod(filters?.startDate, filters?.endDate);
    } catch (error) {
      if (error instanceof ReportingPeriodError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Si aucune date n’est fournie → période absente (export hors reporting).
   * Si une seule date ou une plage invalide → erreur.
   */
  private resolveOptionalReportingPeriod(filters?: {
    startDate?: string;
    endDate?: string;
  }): { startDate: string; endDate: string } | undefined {
    const start = filters?.startDate?.trim() ?? "";
    const end = filters?.endDate?.trim() ?? "";
    if (!start && !end) return undefined;
    return this.requireReportingPeriod(filters);
  }

  private exportFilename(
    base: string,
    ext: string,
    period?: { startDate: string; endDate: string },
  ): string {
    const suffix = period ? reportingPeriodFilenameSuffix(period.startDate, period.endDate) : "";
    return `${base}${suffix}.${ext}`;
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

  private async fetchAllPaginated<T>(
    baseUrl: string,
    path: string,
    itemsKey: "cases" | "interventions" | "customers" | "invoices",
    params: Record<string, string>,
  ): Promise<T[]> {
    const all: T[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const page = await this.callService<
        | CasesListResponse
        | InterventionsListResponse
        | CustomersListResponse
        | OrganizationInvoiceSyncsListResponse
      >(baseUrl, path, {
        ...params,
        limit: String(MAX_PAGE_LIMIT),
        offset: String(offset),
      });
      const items =
        itemsKey === "cases"
          ? (page as CasesListResponse).cases
          : itemsKey === "interventions"
            ? (page as InterventionsListResponse).interventions
            : itemsKey === "customers"
              ? (page as CustomersListResponse).customers
              : (page as OrganizationInvoiceSyncsListResponse).invoices;
      total = typeof page.total === "number" ? page.total : items.length;
      all.push(...(items as T[]));
      offset += items.length;
      if (items.length === 0) break;
    }

    return all;
  }

  private async callService<T>(
    baseUrl: string,
    path: string,
    params: Record<string, string>,
  ): Promise<T> {
    const response = await firstValueFrom(this.httpService.get<T>(`${baseUrl}${path}`, { params }));
    return response.data;
  }
}
