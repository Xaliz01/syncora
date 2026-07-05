import { ForbiddenException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CaseAssignee,
  CaseCustomerRef,
  CaseHistoryChange,
  CaseHistoryAction,
  CaseHistoryEntryResponse,
  CompleteInterventionBody,
  CompleteInterventionResponse,
  CreateCaseBody,
  CreateCaseHistoryBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  CustomerResponse,
  DashboardStatFilter,
  DashboardTodoCaseItem,
  DocumentResponse,
  InterventionResponse,
  SignInterventionBody,
  SignInterventionResponse,
  StartInterventionBody,
  StartInterventionResponse,
  TeamResponse,
  TechnicianResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
  UserPermissionAssignmentResponse,
  UserResponse,
} from "@planwise/shared";
import PDFDocument from "pdfkit";
import { assertAnyAssignablePermission } from "../infrastructure/permission-checks";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import {
  AbstractCasesGatewayService,
  type CreateCaseForOrgBody,
  type UpdateCaseForOrgBody,
  type CreateTemplateForOrgBody,
  type UpdateTemplateForOrgBody,
  type CompleteInterventionForOrgBody,
  type CreateInterventionForOrgBody,
  type SignInterventionForOrgBody,
  type StartInterventionForOrgBody,
  type UpdateInterventionForOrgBody,
  type UpdateTodoForOrgBody,
} from "./ports/cases.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const DOCUMENTS_URL = process.env.DOCUMENTS_SERVICE_URL ?? "http://localhost:3011";

@Injectable()
export class CasesGatewayService extends AbstractCasesGatewayService {
  constructor(
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly customersGateway: AbstractCustomersGatewayService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  // ── Templates ──

  async createTemplate(user: AuthUser, body: CreateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "post",
      path: "/templates",
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies CreateCaseTemplateBody,
    });
  }

  async listTemplates(user: AuthUser) {
    return this.callCasesService<CaseTemplateResponse[]>(user.organizationId, {
      method: "get",
      path: "/templates",
      query: { organizationId: user.organizationId },
    });
  }

  async getTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "get",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateTemplate(user: AuthUser, templateId: string, body: UpdateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "patch",
      path: `/templates/${templateId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies UpdateCaseTemplateBody,
    });
  }

  async deleteTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId },
    });
  }

  // ── Cases ──

  async createCase(user: AuthUser, body: CreateCaseForOrgBody) {
    const { assigneeIds, customerId, ...rest } = body;
    if (customerId?.trim()) {
      await this.customersGateway.getCustomer(user, customerId.trim());
    }
    let assignees: CaseAssignee[] | undefined;
    if (assigneeIds !== undefined) {
      assignees = await this.resolveCaseAssigneesForWrite(user.organizationId, assigneeIds);
    }

    const created = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "post",
      path: "/cases",
      body: {
        organizationId: user.organizationId,
        ...rest,
        ...(customerId?.trim() ? { customerId: customerId.trim() } : {}),
        ...(assignees !== undefined ? { assignees } : {}),
      } as CreateCaseBody,
    });
    this.recordHistory(
      user.organizationId,
      created.id,
      user.id,
      user.name ?? user.email,
      "case_created",
      created.title,
    );
    return this.enrichCaseResponse(user, created);
  }

  async listCases(
    user: AuthUser,
    filters?: { status?: string; assigneeId?: string; priority?: string; search?: string },
  ) {
    const rows = await this.callCasesService<CaseSummaryResponse[]>(user.organizationId, {
      method: "get",
      path: "/cases",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
    return this.enrichCaseSummaries(user, rows);
  }

  async getCase(user: AuthUser, caseId: string) {
    const row = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "get",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId },
    });
    return this.enrichCaseResponse(user, row);
  }

  async updateCase(user: AuthUser, caseId: string, body: UpdateCaseForOrgBody) {
    if (body.customerId !== undefined && body.customerId !== null && body.customerId.trim()) {
      await this.customersGateway.getCustomer(user, body.customerId.trim());
    }

    let previousCase: CaseResponse | undefined;
    try {
      previousCase = await this.callCasesService<CaseResponse>(user.organizationId, {
        method: "get",
        path: `/cases/${caseId}`,
        query: { organizationId: user.organizationId },
      });
    } catch {
      /* proceed without previous state */
    }

    const casesBody = {
      organizationId: user.organizationId,
      ...body,
    } as UpdateCaseBody;

    if (Object.prototype.hasOwnProperty.call(body, "assigneeIds")) {
      assertAnyAssignablePermission(user, ["cases.assign", "cases.update"]);
      casesBody.assignees = await this.resolveCaseAssigneesForWrite(
        user.organizationId,
        body.assigneeIds ?? [],
      );
    }

    const updated = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "patch",
      path: `/cases/${caseId}`,
      body: casesBody,
    });

    this.emitCaseUpdateHistory(user, caseId, body, previousCase, updated);

    return this.enrichCaseResponse(user, updated);
  }

  async deleteCase(user: AuthUser, caseId: string) {
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId },
    });
    this.recordHistory(
      user.organizationId,
      caseId,
      user.id,
      user.name ?? user.email,
      "case_deleted",
    );
    return result;
  }

  async updateTodo(user: AuthUser, caseId: string, body: UpdateTodoForOrgBody) {
    const row = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "put",
      path: `/cases/${caseId}/todos`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateTodoBody,
    });
    const todoLabel = row.steps.flatMap((s) => s.todos).find((t) => t.id === body.todoId)?.label;
    this.recordHistory(
      user.organizationId,
      caseId,
      user.id,
      user.name ?? user.email,
      "todo_updated",
      todoLabel,
      [{ field: "status", newValue: body.status }],
    );
    return this.enrichCaseResponse(user, row);
  }

  // ── Interventions ──

  async createIntervention(user: AuthUser, body: CreateInterventionForOrgBody) {
    const result = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "post",
      path: "/interventions",
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CreateInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      body.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_created",
      result.title,
    );
    return result;
  }

  async listInterventions(
    user: AuthUser,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: string;
      includeTeamAssignments?: string;
    },
  ) {
    let assignedTeamIds: string[] | undefined;
    if (
      filters?.includeTeamAssignments === "true" &&
      filters.assigneeId &&
      filters.assigneeId === user.id
    ) {
      assignedTeamIds = await this.resolveTeamIdsForAssignee(user, filters.assigneeId);
    }

    return this.callCasesService<InterventionResponse[]>(user.organizationId, {
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        caseId: filters?.caseId,
        assigneeId: filters?.assigneeId,
        assignedTeamIds: assignedTeamIds?.length ? assignedTeamIds.join(",") : undefined,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status,
        unscheduled: filters?.unscheduled,
      },
    });
  }

  private async resolveTeamIdsForAssignee(user: AuthUser, assigneeId: string): Promise<string[]> {
    const technicianId =
      user.id === assigneeId
        ? (user.technicianId ??
          (await this.findTechnicianIdByUserId(user.organizationId, assigneeId)))
        : await this.findTechnicianIdByUserId(user.organizationId, assigneeId);
    if (!technicianId) return [];

    try {
      const teams = await this.scopedHttp.request<TeamResponse[]>({
        baseUrl: TECHNICIANS_URL,
        organizationId: user.organizationId,
        method: "get",
        path: "/teams",
        errorLabel: "Technicians service error",
      });
      return teams
        .filter((team) => team.technicianIds.includes(technicianId))
        .map((team) => team.id);
    } catch {
      return [];
    }
  }

  private async findTechnicianIdByUserId(
    organizationId: string,
    userId: string,
  ): Promise<string | undefined> {
    try {
      const technician = await this.scopedHttp.request<TechnicianResponse | null>({
        baseUrl: TECHNICIANS_URL,
        organizationId,
        method: "get",
        path: `/technicians/by-user/${userId}`,
        validateResponseScope: false,
        errorLabel: "Technicians service error",
      });
      return technician?.id;
    } catch {
      return undefined;
    }
  }

  async getIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateIntervention(
    user: AuthUser,
    interventionId: string,
    body: UpdateInterventionForOrgBody,
  ) {
    const result = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "patch",
      path: `/interventions/${interventionId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      result.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_updated",
      result.title,
    );
    return result;
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    let intervention: InterventionResponse | undefined;
    try {
      intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      });
    } catch {
      /* proceed without intervention info */
    }
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    if (intervention) {
      this.recordHistory(
        user.organizationId,
        intervention.caseId,
        user.id,
        user.name ?? user.email,
        "intervention_deleted",
        intervention.title,
      );
    }
    return result;
  }

  async startIntervention(
    user: AuthUser,
    interventionId: string,
    body: StartInterventionForOrgBody,
  ) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<StartInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/start`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as StartInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_started",
      intervention.title,
    );
    return {
      ...result,
      title: intervention.title,
      caseId: intervention.caseId,
      caseTitle: intervention.caseTitle,
    };
  }

  async completeIntervention(
    user: AuthUser,
    interventionId: string,
    body: CompleteInterventionForOrgBody,
  ) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<CompleteInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/complete`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CompleteInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_completed",
      intervention.title,
    );
    return {
      ...result,
      title: intervention.title,
      caseId: intervention.caseId,
      caseTitle: intervention.caseTitle,
    };
  }

  // ── Signature ──

  async signIntervention(user: AuthUser, interventionId: string, body: SignInterventionForOrgBody) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<SignInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/sign`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as SignInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_signed",
      `Signé par ${body.signatoryName}`,
    );
    return result;
  }

  // ── Report PDF ──

  async generateInterventionReport(user: AuthUser, interventionId: string): Promise<Buffer> {
    const [intervention, caseData, signatureResult] = await Promise.all([
      this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      }),
      this.fetchCaseForReport(user, interventionId),
      this.fetchSignatureData(user.organizationId, interventionId),
    ]);

    const customer = caseData?.customer;
    const photos = await this.fetchInterventionPhotos(user, interventionId);

    return this.buildReportPdf(intervention, caseData, customer, photos, signatureResult);
  }

  private async fetchCaseForReport(
    user: AuthUser,
    interventionId: string,
  ): Promise<CaseResponse | undefined> {
    try {
      const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      });
      return await this.callCasesService<CaseResponse>(user.organizationId, {
        method: "get",
        path: `/cases/${intervention.caseId}`,
        query: { organizationId: user.organizationId },
      }).then((c) => this.enrichCaseResponse(user, c));
    } catch {
      return undefined;
    }
  }

  private async fetchSignatureData(
    organizationId: string,
    interventionId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }> {
    try {
      return await this.callCasesService<{ signatureData?: string; signatoryName?: string }>(
        organizationId,
        {
          method: "get",
          path: `/interventions/${interventionId}/signature-image`,
          query: { organizationId },
        },
      );
    } catch {
      return {};
    }
  }

  private async fetchInterventionPhotos(
    user: AuthUser,
    interventionId: string,
  ): Promise<{ data: Buffer; mimeType: string }[]> {
    try {
      const docs = await firstValueFrom(
        this.httpService.get<DocumentResponse[]>(`${DOCUMENTS_URL}/documents`, {
          params: {
            organizationId: user.organizationId,
            entityType: "intervention",
            entityId: interventionId,
          },
        }),
      ).then((r) => r.data);

      const images = docs.filter((d) => d.mimeType.startsWith("image/"));
      const results: { data: Buffer; mimeType: string }[] = [];

      for (const img of images.slice(0, 6)) {
        try {
          const urlRes = await firstValueFrom(
            this.httpService.get<{ url: string }>(
              `${DOCUMENTS_URL}/documents/${img.id}/download-url`,
              { params: { organizationId: user.organizationId } },
            ),
          );
          let downloadUrl = urlRes.data.url;
          if (downloadUrl.startsWith("/documents/download/")) {
            downloadUrl = `${DOCUMENTS_URL}${downloadUrl}`;
          }
          const fileRes = await firstValueFrom(
            this.httpService.get(downloadUrl, { responseType: "arraybuffer" }),
          );
          results.push({ data: Buffer.from(fileRes.data), mimeType: img.mimeType });
        } catch {
          /* skip photos that fail to download */
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  private buildReportPdf(
    intervention: InterventionResponse,
    caseData: CaseResponse | undefined,
    customer: CaseCustomerRef | undefined,
    photos: { data: Buffer; mimeType: string }[],
    signatureResult: { signatureData?: string; signatoryName?: string },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const brandColor = "#6d28d9";
      const textColor = "#1e293b";
      const mutedColor = "#64748b";

      // Header
      doc
        .fontSize(22)
        .fillColor(brandColor)
        .text("Planwise", 50, 40)
        .fontSize(10)
        .fillColor(mutedColor)
        .text("Rapport d'intervention", 50, 65);

      doc.moveTo(50, 85).lineTo(545, 85).strokeColor("#e2e8f0").lineWidth(1).stroke();

      doc.y = 100;

      // Intervention title & status
      doc.fontSize(16).fillColor(textColor).text(intervention.title, 50, doc.y, { width: 495 });

      const statusLabels: Record<string, string> = {
        planned: "Planifiée",
        in_progress: "En cours",
        completed: "Terminée",
        cancelled: "Annulée",
      };
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .text(
          `Statut : ${statusLabels[intervention.status] ?? intervention.status}`,
          50,
          doc.y + 5,
        );

      doc.y += 15;

      // Case & customer info
      if (caseData) {
        this.pdfSection(doc, "Dossier");
        this.pdfField(doc, "Titre", caseData.title);
        if (caseData.description) this.pdfField(doc, "Description", caseData.description);
      }

      if (customer) {
        this.pdfSection(doc, "Client");
        this.pdfField(doc, "Nom", customer.displayName);
        if (customer.email) this.pdfField(doc, "Email", customer.email);
        if (customer.phone) this.pdfField(doc, "Téléphone", customer.phone);
        if (customer.mobile) this.pdfField(doc, "Mobile", customer.mobile);
        if (customer.address) {
          const addr = [
            customer.address.line1,
            customer.address.line2,
            [customer.address.postalCode, customer.address.city].filter(Boolean).join(" "),
            customer.address.country,
          ]
            .filter(Boolean)
            .join(", ");
          this.pdfField(doc, "Adresse", addr);
        }
      }

      // Intervention details
      this.pdfSection(doc, "Détails de l'intervention");
      if (intervention.description) {
        this.pdfField(doc, "Description", intervention.description);
      }
      if (intervention.assigneeName) {
        this.pdfField(doc, "Technicien", intervention.assigneeName);
      }
      if (intervention.assignedTeamName) {
        this.pdfField(doc, "Équipe", intervention.assignedTeamName);
      }
      if (intervention.scheduledStart) {
        this.pdfField(
          doc,
          "Planifié",
          this.formatDateTimeFr(intervention.scheduledStart) +
            (intervention.scheduledEnd
              ? ` → ${this.formatDateTimeFr(intervention.scheduledEnd)}`
              : ""),
        );
      }
      if (intervention.startedAt) {
        this.pdfField(doc, "Démarré", this.formatDateTimeFr(intervention.startedAt));
      }
      if (intervention.completedAt) {
        this.pdfField(doc, "Terminé", this.formatDateTimeFr(intervention.completedAt));
      }
      if (intervention.startedAt && intervention.completedAt) {
        const ms =
          new Date(intervention.completedAt).getTime() - new Date(intervention.startedAt).getTime();
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        this.pdfField(
          doc,
          "Durée",
          hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes}min`,
        );
      }
      if (intervention.notes) {
        this.pdfField(doc, "Notes", intervention.notes);
      }

      // Photos
      if (photos.length > 0) {
        this.pdfSection(doc, "Photos terrain");
        const photoWidth = 150;
        const photoHeight = 112;
        const gap = 15;
        let x = 50;

        for (const photo of photos) {
          if (doc.y + photoHeight > 750) {
            doc.addPage();
            x = 50;
          }
          try {
            doc.image(photo.data, x, doc.y, {
              fit: [photoWidth, photoHeight],
            });
          } catch {
            /* skip invalid images */
          }
          x += photoWidth + gap;
          if (x + photoWidth > 545) {
            x = 50;
            doc.y += photoHeight + gap;
          }
        }
        if (x > 50) {
          doc.y += photoHeight + gap;
        }
      }

      // Signature
      if (signatureResult.signatureData) {
        if (doc.y + 120 > 750) doc.addPage();
        this.pdfSection(doc, "Signature client");
        if (signatureResult.signatoryName) {
          this.pdfField(doc, "Nom", signatureResult.signatoryName);
        }
        if (intervention.signedAt) {
          this.pdfField(doc, "Date", this.formatDateTimeFr(intervention.signedAt));
        }
        try {
          const sigBuffer = this.dataUrlToBuffer(signatureResult.signatureData);
          if (sigBuffer) {
            doc.image(sigBuffer, 50, doc.y + 5, { fit: [200, 80] });
            doc.y += 90;
          }
        } catch {
          /* skip invalid signature */
        }
      }

      // Footer
      doc.moveTo(50, 780).lineTo(545, 780).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc
        .fontSize(8)
        .fillColor(mutedColor)
        .text(`Généré le ${this.formatDateTimeFr(new Date().toISOString())} — Planwise`, 50, 785, {
          align: "center",
          width: 495,
        });

      doc.end();
    });
  }

  private pdfSection(doc: PDFKit.PDFDocument, title: string): void {
    doc.y += 10;
    doc.fontSize(12).fillColor("#6d28d9").text(title, 50, doc.y, { width: 495 });
    doc.y += 3;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    doc.y += 8;
  }

  private pdfField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(`${label} :`, 50, doc.y, { continued: true, width: 100 })
      .fillColor("#1e293b")
      .text(` ${value}`, { width: 395 });
    doc.y += 3;
  }

  private formatDateTimeFr(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private dataUrlToBuffer(dataUrl: string): Buffer | null {
    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return null;
    return Buffer.from(match[1], "base64");
  }

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    const userProfileId = await this.resolveUserProfileId(user);
    const dash = await this.callCasesService<CaseDashboardResponse>(user.organizationId, {
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
      },
    });
    const [assignedCases, overdueCases] = await Promise.all([
      this.enrichCaseSummaries(user, dash.assignedCases),
      this.enrichCaseSummaries(user, dash.overdueCases),
    ]);
    return { ...dash, assignedCases, overdueCases };
  }

  async getDashboardTodoCases(
    user: AuthUser,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]> {
    const userProfileId = await this.resolveUserProfileId(user);
    const rows = await this.callCasesService<DashboardTodoCaseItem[]>(user.organizationId, {
      method: "get",
      path: "/dashboard/todo-cases",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
        templateId,
        todoLabel,
      },
    });
    return this.enrichDashboardCaseListItems(user, rows);
  }

  async getDashboardStatCases(
    user: AuthUser,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]> {
    const userProfileId = await this.resolveUserProfileId(user);
    const rows = await this.callCasesService<DashboardTodoCaseItem[]>(user.organizationId, {
      method: "get",
      path: "/dashboard/stat-cases",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
        filter,
      },
    });
    return this.enrichDashboardCaseListItems(user, rows);
  }

  private async enrichDashboardCaseListItems(
    user: AuthUser,
    rows: DashboardTodoCaseItem[],
  ): Promise<DashboardTodoCaseItem[]> {
    const summaries: CaseSummaryResponse[] = rows.map((r) => ({
      id: r.caseId,
      organizationId: user.organizationId,
      title: r.caseTitle,
      status: r.status,
      priority: r.priority,
      assignees: [],
      tags: [],
      progress: 0,
      interventionCount: 0,
      customerId: r.customerId,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
    }));
    const enriched = await this.enrichCaseSummaries(user, summaries);
    return rows.map((r, i) => ({
      ...r,
      customerName: enriched[i]?.customer?.displayName,
    }));
  }

  private async resolveUserProfileId(user: AuthUser): Promise<string | undefined> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<UserPermissionAssignmentResponse>(
          `${PERMISSIONS_URL}/assignments/${user.id}`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      return res.data.profileId;
    } catch {
      return undefined;
    }
  }

  // ── History ──

  async listCaseHistory(user: AuthUser, caseId: string) {
    return this.callCasesService<CaseHistoryEntryResponse[]>(user.organizationId, {
      method: "get",
      path: `/cases/${caseId}/history`,
      query: { organizationId: user.organizationId },
    });
  }

  private emitCaseUpdateHistory(
    user: AuthUser,
    caseId: string,
    body: UpdateCaseForOrgBody,
    prev: CaseResponse | undefined,
    updated: CaseResponse,
  ): void {
    const actorName = user.name ?? user.email;

    if (body.status !== undefined && prev && body.status !== prev.status) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "status_changed",
        undefined,
        [{ field: "status", oldValue: prev.status, newValue: body.status }],
      );
      return;
    }

    if (body.priority !== undefined && prev && body.priority !== prev.priority) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "priority_changed",
        undefined,
        [{ field: "priority", oldValue: prev.priority, newValue: body.priority }],
      );
      return;
    }

    if (Object.prototype.hasOwnProperty.call(body, "assigneeIds")) {
      const oldNames = (prev?.assignees ?? []).map((a) => a.name).join(", ") || "aucun";
      const newNames = (updated.assignees ?? []).map((a) => a.name).join(", ") || "aucun";
      if (oldNames !== newNames) {
        this.recordHistory(
          user.organizationId,
          caseId,
          user.id,
          actorName,
          "assignees_changed",
          undefined,
          [{ field: "assignees", oldValue: oldNames, newValue: newNames }],
        );
        return;
      }
    }

    if (body.customerId !== undefined && prev && body.customerId !== prev.customerId) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "customer_changed",
        undefined,
        [
          {
            field: "customer",
            oldValue: prev.customerId ?? "aucun",
            newValue: body.customerId ?? "aucun",
          },
        ],
      );
      return;
    }

    const changes: CaseHistoryChange[] = [];
    if (body.title !== undefined && prev && body.title !== prev.title) {
      changes.push({ field: "title", oldValue: prev.title, newValue: body.title });
    }
    if (body.description !== undefined && prev && body.description !== prev.description) {
      changes.push({
        field: "description",
        oldValue: prev.description ?? "",
        newValue: body.description ?? "",
      });
    }
    if (body.dueDate !== undefined && prev) {
      const oldDue = prev.dueDate?.split("T")[0] ?? "";
      const newDue = body.dueDate === null ? "" : (body.dueDate?.split("T")[0] ?? "");
      if (oldDue !== newDue) {
        changes.push({ field: "dueDate", oldValue: oldDue, newValue: newDue });
      }
    }

    if (changes.length > 0) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "case_updated",
        undefined,
        changes,
      );
    }
  }

  private recordHistory(
    organizationId: string,
    caseId: string,
    actorId: string,
    actorName: string,
    action: CaseHistoryAction,
    details?: string,
    changes?: CaseHistoryChange[],
  ): void {
    const body: CreateCaseHistoryBody = {
      organizationId,
      caseId,
      actorId,
      actorName,
      action,
      details,
      changes,
    };
    this.callCasesService<CaseHistoryEntryResponse>(organizationId, {
      method: "post",
      path: `/cases/${caseId}/history`,
      body,
    }).catch(() => {
      /* best-effort: don't fail the main operation if history recording fails */
    });
  }

  private toCaseCustomerRef(c: CustomerResponse): CaseCustomerRef {
    return {
      id: c.id,
      displayName: c.displayName,
      kind: c.kind,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      address: c.address,
      sites: c.sites,
    };
  }

  private resolveInterventionAddress(
    customer: CustomerResponse | undefined,
    interventionSiteId: string | undefined,
  ) {
    if (!customer || !interventionSiteId) return undefined;
    const site = customer.sites?.find((s) => s.id === interventionSiteId);
    return site?.address;
  }

  private async enrichCaseSummaries(
    user: AuthUser,
    rows: CaseSummaryResponse[],
  ): Promise<CaseSummaryResponse[]> {
    const ids = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as string[];
    if (ids.length === 0) return rows;
    const customers = await this.customersGateway.listCustomersByIds(user, ids);
    const map = new Map(customers.map((c) => [c.id, c]));
    return rows.map((r) => {
      const c = r.customerId ? map.get(r.customerId) : undefined;
      const interventionAddress = this.resolveInterventionAddress(c, r.interventionSiteId);
      return {
        ...r,
        customer: c ? this.toCaseCustomerRef(c) : undefined,
        interventionAddress,
      };
    });
  }

  private async enrichCaseResponse(user: AuthUser, row: CaseResponse): Promise<CaseResponse> {
    if (!row.customerId) return { ...row, customer: undefined };
    try {
      const c = await this.customersGateway.getCustomer(user, row.customerId);
      const interventionAddress = this.resolveInterventionAddress(c, row.interventionSiteId);
      return {
        ...row,
        customer: this.toCaseCustomerRef(c),
        interventionAddress,
      };
    } catch {
      return { ...row, customer: undefined };
    }
  }

  private async resolveCaseAssigneesForWrite(
    organizationId: string,
    assigneeIds: string[],
  ): Promise<CaseAssignee[]> {
    const ids = [...new Set(assigneeIds.map((id) => id.trim()).filter(Boolean))];
    const assignees: CaseAssignee[] = [];
    for (const id of ids) {
      const user = await this.callUsersService<UserResponse>(organizationId, {
        method: "get",
        path: `/users/${id}`,
      });
      if (user.organizationId !== organizationId) {
        throw new ForbiddenException(
          "Un utilisateur assigné n'appartient pas à cette organisation",
        );
      }
      assignees.push({ userId: id, name: user.name?.trim() || user.email });
    }
    return assignees;
  }

  private callUsersService<T>(
    organizationId: string,
    params: {
      method: "get" | "post" | "patch" | "put" | "delete";
      path: string;
      body?: object;
      query?: Record<string, unknown>;
      validateResponseScope?: boolean;
    },
  ): Promise<T> {
    return this.scopedHttp.request<T>({
      baseUrl: USERS_URL,
      organizationId,
      errorLabel: "Users service error",
      method: params.method,
      path: params.path,
      body: params.body,
      query: params.query,
      validateResponseScope: params.validateResponseScope,
    });
  }

  private callCasesService<T>(
    organizationId: string,
    params: {
      method: "get" | "post" | "patch" | "put" | "delete";
      path: string;
      body?: object;
      query?: Record<string, unknown>;
      validateResponseScope?: boolean;
    },
  ): Promise<T> {
    return this.scopedHttp.request<T>({
      baseUrl: CASES_URL,
      organizationId,
      errorLabel: "Cases service error",
      method: params.method,
      path: params.path,
      body: params.body,
      query: params.query,
      validateResponseScope: params.validateResponseScope,
    });
  }
}
