import { ForbiddenException, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CaseAssignee,
  CaseCustomerRef,
  CaseHistoryChange,
  CaseHistoryAction,
  CaseHistoryEntryResponse,
  CreateCaseBody,
  CreateCaseHistoryBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  CustomerResponse,
  DashboardTodoCaseItem,
  InterventionResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
  UserResponse,
} from "@syncora/shared";
import { assertAnyAssignablePermission } from "../infrastructure/permission-checks";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
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
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly customersGateway: AbstractCustomersGatewayService,
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
    },
  ) {
    return this.callCasesService<InterventionResponse[]>(user.organizationId, {
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
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

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    const dash = await this.callCasesService<CaseDashboardResponse>(user.organizationId, {
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
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
    return this.callCasesService<DashboardTodoCaseItem[]>(user.organizationId, {
      method: "get",
      path: "/dashboard/todo-cases",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userRole: user.role,
        templateId,
        todoLabel,
      },
    });
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
    };
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
