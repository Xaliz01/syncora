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
  AddInterventionArticleUsageBody,
  ArticleResponse,
  CreateArticleBody,
  CreateArticleMovementBody,
  AuthUser,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  InterventionResponse,
  StockMovementResponse,
  UpdateArticleBody,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";

const CASES_URL =
  process.env.CASES_SERVICE_URL ?? "http://localhost:3004";

export interface CreateCaseForOrgBody {
  templateId?: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateCaseForOrgBody {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
}

export interface CreateTemplateForOrgBody {
  name: string;
  description?: string;
  steps: { name: string; description?: string; order: number; todos: { label: string; description?: string }[] }[];
}

export interface UpdateTemplateForOrgBody {
  name?: string;
  description?: string;
  steps?: { name: string; description?: string; order: number; todos: { label: string; description?: string }[] }[];
}

export interface CreateInterventionForOrgBody {
  caseId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionForOrgBody {
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export interface AddInterventionArticleUsageForOrgBody {
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  note?: string;
}

export interface CreateArticleForOrgBody {
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  initialStock?: number;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface UpdateArticleForOrgBody {
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface CreateArticleMovementForOrgBody {
  articleId: string;
  movementType: "in" | "out" | "adjustment";
  quantity: number;
  note?: string;
  reason?: string;
  interventionId?: string;
  caseId?: string;
}

export interface UpdateTodoForOrgBody {
  stepId: string;
  todoId: string;
  status: string;
}

@Injectable()
export class CasesGatewayService {
  constructor(private readonly httpService: HttpService) {}

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

  async addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody
  ) {
    return this.callCasesService<InterventionResponse>({
      method: "post",
      path: `/interventions/${interventionId}/articles`,
      body: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorUserName: user.name,
        ...body
      } as AddInterventionArticleUsageBody
    });
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId }
    });
  }

  // ── Articles / stock ──

  async createArticle(user: AuthUser, body: CreateArticleForOrgBody) {
    return this.callCasesService<ArticleResponse>({
      method: "post",
      path: "/articles",
      body: {
        organizationId: user.organizationId,
        ...body
      } as CreateArticleBody
    });
  }

  async listArticles(
    user: AuthUser,
    filters?: { search?: string; lowStockOnly?: boolean; activeOnly?: boolean }
  ) {
    return this.callCasesService<ArticleResponse[]>({
      method: "get",
      path: "/articles",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
    });
  }

  async getArticle(user: AuthUser, articleId: string) {
    return this.callCasesService<ArticleResponse>({
      method: "get",
      path: `/articles/${articleId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateArticle(user: AuthUser, articleId: string, body: UpdateArticleForOrgBody) {
    return this.callCasesService<ArticleResponse>({
      method: "patch",
      path: `/articles/${articleId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateArticleBody
    });
  }

  async deleteArticle(user: AuthUser, articleId: string) {
    return this.callCasesService<{ deleted: true }>({
      method: "delete",
      path: `/articles/${articleId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async createArticleMovement(user: AuthUser, body: CreateArticleMovementForOrgBody) {
    return this.callCasesService<StockMovementResponse>({
      method: "post",
      path: "/articles/movements",
      body: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorUserName: user.name,
        ...body
      } as CreateArticleMovementBody
    });
  }

  async listArticleMovements(
    user: AuthUser,
    filters?: { articleId?: string; interventionId?: string; limit?: number }
  ) {
    return this.callCasesService<StockMovementResponse[]>({
      method: "get",
      path: "/articles/movements/list",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
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
