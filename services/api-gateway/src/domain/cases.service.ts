import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CaseAssignee,
  CaseCustomerRef,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  CustomerResponse,
  InterventionResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
  UserResponse,
} from "@syncora/shared";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import {
  AbstractCasesGatewayService,
  type CreateCaseForOrgBody,
  type UpdateCaseForOrgBody,
  type CreateTemplateForOrgBody,
  type UpdateTemplateForOrgBody,
  type CreateInterventionForOrgBody,
  type UpdateInterventionForOrgBody,
  type UpdateTodoForOrgBody,
} from "./ports/cases.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class CasesGatewayService extends AbstractCasesGatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly customersGateway: AbstractCustomersGatewayService,
  ) {
    super();
  }

  // ── Templates ──

  async createTemplate(user: AuthUser, body: CreateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "post",
      path: "/templates",
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies CreateCaseTemplateBody,
    });
  }

  async listTemplates(user: AuthUser) {
    return this.callCasesService<CaseTemplateResponse[]>({
      method: "get",
      path: "/templates",
      query: { organizationId: user.organizationId },
    });
  }

  async getTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "get",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateTemplate(user: AuthUser, templateId: string, body: UpdateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "patch",
      path: `/templates/${templateId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies UpdateCaseTemplateBody,
    });
  }

  async deleteTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<{ deleted: true }>({
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

    const created = await this.callCasesService<CaseResponse>({
      method: "post",
      path: "/cases",
      body: {
        organizationId: user.organizationId,
        ...rest,
        ...(customerId?.trim() ? { customerId: customerId.trim() } : {}),
        ...(assignees !== undefined ? { assignees } : {}),
      } as CreateCaseBody,
    });
    return this.enrichCaseResponse(user, created);
  }

  async listCases(
    user: AuthUser,
    filters?: { status?: string; assigneeId?: string; priority?: string; search?: string },
  ) {
    const rows = await this.callCasesService<CaseSummaryResponse[]>({
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
    const row = await this.callCasesService<CaseResponse>({
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
    const casesBody = {
      organizationId: user.organizationId,
      ...body,
    } as UpdateCaseBody;

    if (Object.prototype.hasOwnProperty.call(body, "assigneeIds")) {
      casesBody.assignees = await this.resolveCaseAssigneesForWrite(
        user.organizationId,
        body.assigneeIds ?? [],
      );
    }

    const updated = await this.callCasesService<CaseResponse>({
      method: "patch",
      path: `/cases/${caseId}`,
      body: casesBody,
    });
    return this.enrichCaseResponse(user, updated);
  }

  async deleteCase(user: AuthUser, caseId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateTodo(user: AuthUser, caseId: string, body: UpdateTodoForOrgBody) {
    const row = await this.callCasesService<CaseResponse>({
      method: "put",
      path: `/cases/${caseId}/todos`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateTodoBody,
    });
    return this.enrichCaseResponse(user, row);
  }

  // ── Interventions ──

  async createIntervention(user: AuthUser, body: CreateInterventionForOrgBody) {
    return this.callCasesService<InterventionResponse>({
      method: "post",
      path: "/interventions",
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CreateInterventionBody,
    });
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
    },
  ) {
    return this.callCasesService<InterventionResponse[]>({
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
  }

  async getIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<InterventionResponse>({
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
    return this.callCasesService<InterventionResponse>({
      method: "patch",
      path: `/interventions/${interventionId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateInterventionBody,
    });
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
  }

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    const dash = await this.callCasesService<CaseDashboardResponse>({
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
      },
    });
    const [assignedCases, overdueCases] = await Promise.all([
      this.enrichCaseSummaries(user, dash.assignedCases),
      this.enrichCaseSummaries(user, dash.overdueCases),
    ]);
    return { ...dash, assignedCases, overdueCases };
  }

  private toCaseCustomerRef(c: CustomerResponse): CaseCustomerRef {
    return { id: c.id, displayName: c.displayName, kind: c.kind };
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
      return { ...r, customer: c ? this.toCaseCustomerRef(c) : undefined };
    });
  }

  private async enrichCaseResponse(user: AuthUser, row: CaseResponse): Promise<CaseResponse> {
    if (!row.customerId) return { ...row, customer: undefined };
    try {
      const c = await this.customersGateway.getCustomer(user, row.customerId);
      return { ...row, customer: this.toCaseCustomerRef(c) };
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
      const user = await this.callUsersService<UserResponse>({
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

  private async callUsersService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${USERS_URL}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callCasesService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${CASES_URL}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
