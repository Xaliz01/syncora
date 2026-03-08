import type {
  AuthUser,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  InterventionResponse
} from "@syncora/shared";

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
  steps: {
    name: string;
    description?: string;
    order: number;
    todos: { label: string; description?: string }[];
  }[];
}

export interface UpdateTemplateForOrgBody {
  name?: string;
  description?: string;
  steps?: {
    name: string;
    description?: string;
    order: number;
    todos: { label: string; description?: string }[];
  }[];
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

export interface UpdateTodoForOrgBody {
  stepId: string;
  todoId: string;
  status: string;
}

export abstract class AbstractCasesGatewayService {
  abstract createTemplate(user: AuthUser, body: CreateTemplateForOrgBody): Promise<CaseTemplateResponse>;
  abstract listTemplates(user: AuthUser): Promise<CaseTemplateResponse[]>;
  abstract getTemplate(user: AuthUser, templateId: string): Promise<CaseTemplateResponse>;
  abstract updateTemplate(
    user: AuthUser,
    templateId: string,
    body: UpdateTemplateForOrgBody
  ): Promise<CaseTemplateResponse>;
  abstract deleteTemplate(user: AuthUser, templateId: string): Promise<{ deleted: true }>;
  abstract createCase(user: AuthUser, body: CreateCaseForOrgBody): Promise<CaseResponse>;
  abstract listCases(
    user: AuthUser,
    filters?: { status?: string; assigneeId?: string; priority?: string; search?: string }
  ): Promise<CaseSummaryResponse[]>;
  abstract getCase(user: AuthUser, caseId: string): Promise<CaseResponse>;
  abstract updateCase(
    user: AuthUser,
    caseId: string,
    body: UpdateCaseForOrgBody
  ): Promise<CaseResponse>;
  abstract deleteCase(user: AuthUser, caseId: string): Promise<{ deleted: true }>;
  abstract updateTodo(
    user: AuthUser,
    caseId: string,
    body: UpdateTodoForOrgBody
  ): Promise<CaseResponse>;
  abstract createIntervention(
    user: AuthUser,
    body: CreateInterventionForOrgBody
  ): Promise<InterventionResponse>;
  abstract listInterventions(
    user: AuthUser,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<InterventionResponse[]>;
  abstract getIntervention(
    user: AuthUser,
    interventionId: string
  ): Promise<InterventionResponse>;
  abstract updateIntervention(
    user: AuthUser,
    interventionId: string,
    body: UpdateInterventionForOrgBody
  ): Promise<InterventionResponse>;
  abstract deleteIntervention(
    user: AuthUser,
    interventionId: string
  ): Promise<{ deleted: true }>;
  abstract getDashboard(user: AuthUser): Promise<CaseDashboardResponse>;
}
