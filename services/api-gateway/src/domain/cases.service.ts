import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  InterventionResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";
import {
  AbstractCasesGatewayService,
  type CreateCaseForOrgBody,
  type UpdateCaseForOrgBody,
  type CreateTemplateForOrgBody,
  type UpdateTemplateForOrgBody,
  type CreateInterventionForOrgBody,
  type UpdateInterventionForOrgBody,
  type UpdateTodoForOrgBody
} from "./ports/cases.service.port";

const CASES_URL =
  process.env.CASES_SERVICE_URL ?? "http://localhost:3004";

@Injectable()
export class CasesGatewayService extends AbstractCasesGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  // ── Templates ──

  async createTemplate(user: AuthUser, body: CreateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "post",
      path: "/templates",
      body: {
        organizationId: user.organizationId,
        ...body
      } satisfies CreateCaseTemplateBody
    });
  }

  async listTemplates(user: AuthUser) {
    return this.callCasesService<CaseTemplateResponse[]>({
      method: "get",
      path: "/templates",
      query: { organizationId: user.organizationId }
    });
  }

  async getTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "get",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateTemplate(user: AuthUser, templateId: string, body: UpdateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>({
      method: "patch",
      path: `/templates/${templateId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } satisfies UpdateCaseTemplateBody
    });
  }

  async deleteTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId }
    });
  }

  // ── Cases ──

  async createCase(user: AuthUser, body: CreateCaseForOrgBody) {
    return this.callCasesService<CaseResponse>({
      method: "post",
      path: "/cases",
      body: {
        organizationId: user.organizationId,
        ...body
      } as CreateCaseBody
    });
  }

  async listCases(
    user: AuthUser,
    filters?: { status?: string; assigneeId?: string; priority?: string; search?: string }
  ) {
    return this.callCasesService<CaseSummaryResponse[]>({
      method: "get",
      path: "/cases",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
    });
  }

  async getCase(user: AuthUser, caseId: string) {
    return this.callCasesService<CaseResponse>({
      method: "get",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateCase(user: AuthUser, caseId: string, body: UpdateCaseForOrgBody) {
    return this.callCasesService<CaseResponse>({
      method: "patch",
      path: `/cases/${caseId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateCaseBody
    });
  }

  async deleteCase(user: AuthUser, caseId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateTodo(user: AuthUser, caseId: string, body: UpdateTodoForOrgBody) {
    return this.callCasesService<CaseResponse>({
      method: "put",
      path: `/cases/${caseId}/todos`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateTodoBody
    });
  }

  // ── Interventions ──

  async createIntervention(user: AuthUser, body: CreateInterventionForOrgBody) {
    return this.callCasesService<InterventionResponse>({
      method: "post",
      path: "/interventions",
      body: {
        organizationId: user.organizationId,
        ...body
      } as CreateInterventionBody
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
    }
  ) {
    return this.callCasesService<InterventionResponse[]>({
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
    });
  }

  async getIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<InterventionResponse>({
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateIntervention(user: AuthUser, interventionId: string, body: UpdateInterventionForOrgBody) {
    return this.callCasesService<InterventionResponse>({
      method: "patch",
      path: `/interventions/${interventionId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateInterventionBody
    });
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId }
    });
  }

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    return this.callCasesService<CaseDashboardResponse>({
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id
      }
    });
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
          params: params.query
        })
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message ?? "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
