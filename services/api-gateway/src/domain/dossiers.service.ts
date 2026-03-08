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
  CreateDossierBody,
  CreateDossierTemplateBody,
  CreateInterventionBody,
  DashboardResponse,
  DossierResponse,
  DossierSummaryResponse,
  DossierTemplateResponse,
  InterventionResponse,
  UpdateDossierBody,
  UpdateDossierTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";

const DOSSIERS_URL =
  process.env.DOSSIERS_SERVICE_URL ?? "http://localhost:3004";

export interface CreateDossierForOrgBody {
  templateId?: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateDossierForOrgBody {
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
  dossierId: string;
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

export interface UpdateTodoForOrgBody {
  stepId: string;
  todoId: string;
  status: string;
}

@Injectable()
export class DossiersGatewayService {
  constructor(private readonly httpService: HttpService) {}

  // ── Templates ──

  async createTemplate(user: AuthUser, body: CreateTemplateForOrgBody) {
    return this.callDossiersService<DossierTemplateResponse>({
      method: "post",
      path: "/templates",
      body: {
        organizationId: user.organizationId,
        ...body
      } satisfies CreateDossierTemplateBody
    });
  }

  async listTemplates(user: AuthUser) {
    return this.callDossiersService<DossierTemplateResponse[]>({
      method: "get",
      path: "/templates",
      query: { organizationId: user.organizationId }
    });
  }

  async getTemplate(user: AuthUser, templateId: string) {
    return this.callDossiersService<DossierTemplateResponse>({
      method: "get",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateTemplate(user: AuthUser, templateId: string, body: UpdateTemplateForOrgBody) {
    return this.callDossiersService<DossierTemplateResponse>({
      method: "patch",
      path: `/templates/${templateId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } satisfies UpdateDossierTemplateBody
    });
  }

  async deleteTemplate(user: AuthUser, templateId: string) {
    return this.callDossiersService<{ deleted: true }>({
      method: "delete",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId }
    });
  }

  // ── Dossiers ──

  async createDossier(user: AuthUser, body: CreateDossierForOrgBody) {
    return this.callDossiersService<DossierResponse>({
      method: "post",
      path: "/dossiers",
      body: {
        organizationId: user.organizationId,
        ...body
      } as CreateDossierBody
    });
  }

  async listDossiers(
    user: AuthUser,
    filters?: { status?: string; assigneeId?: string; priority?: string; search?: string }
  ) {
    return this.callDossiersService<DossierSummaryResponse[]>({
      method: "get",
      path: "/dossiers",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
    });
  }

  async getDossier(user: AuthUser, dossierId: string) {
    return this.callDossiersService<DossierResponse>({
      method: "get",
      path: `/dossiers/${dossierId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateDossier(user: AuthUser, dossierId: string, body: UpdateDossierForOrgBody) {
    return this.callDossiersService<DossierResponse>({
      method: "patch",
      path: `/dossiers/${dossierId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateDossierBody
    });
  }

  async deleteDossier(user: AuthUser, dossierId: string) {
    return this.callDossiersService<{ deleted: true }>({
      method: "delete",
      path: `/dossiers/${dossierId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateTodo(user: AuthUser, dossierId: string, body: UpdateTodoForOrgBody) {
    return this.callDossiersService<DossierResponse>({
      method: "put",
      path: `/dossiers/${dossierId}/todos`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateTodoBody
    });
  }

  // ── Interventions ──

  async createIntervention(user: AuthUser, body: CreateInterventionForOrgBody) {
    return this.callDossiersService<InterventionResponse>({
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
      dossierId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ) {
    return this.callDossiersService<InterventionResponse[]>({
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        ...filters
      }
    });
  }

  async getIntervention(user: AuthUser, interventionId: string) {
    return this.callDossiersService<InterventionResponse>({
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId }
    });
  }

  async updateIntervention(user: AuthUser, interventionId: string, body: UpdateInterventionForOrgBody) {
    return this.callDossiersService<InterventionResponse>({
      method: "patch",
      path: `/interventions/${interventionId}`,
      body: {
        organizationId: user.organizationId,
        ...body
      } as UpdateInterventionBody
    });
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    return this.callDossiersService<{ deleted: true }>({
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId }
    });
  }

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    return this.callDossiersService<DashboardResponse>({
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id
      }
    });
  }

  private async callDossiersService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${DOSSIERS_URL}${params.path}`,
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
