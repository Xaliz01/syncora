import type {
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

export abstract class AbstractCasesService {
  abstract createTemplate(body: CreateCaseTemplateBody): Promise<CaseTemplateResponse>;
  abstract listTemplates(organizationId: string): Promise<CaseTemplateResponse[]>;
  abstract getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse>;
  abstract updateTemplate(
    id: string,
    body: UpdateCaseTemplateBody
  ): Promise<CaseTemplateResponse>;
  abstract deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract createCase(body: CreateCaseBody): Promise<CaseResponse>;
  abstract listCases(
    organizationId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
    }
  ): Promise<CaseSummaryResponse[]>;
  abstract getCase(id: string, organizationId: string): Promise<CaseResponse>;
  abstract updateCase(id: string, body: UpdateCaseBody): Promise<CaseResponse>;
  abstract deleteCase(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract updateTodo(caseId: string, body: UpdateTodoBody): Promise<CaseResponse>;
  abstract createIntervention(body: CreateInterventionBody): Promise<InterventionResponse>;
  abstract listInterventions(
    organizationId: string,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      assignedTeamId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      /** Sans créneau horaire (scheduledStart absent ou null) */
      unscheduled?: boolean;
    }
  ): Promise<InterventionResponse[]>;
  abstract getIntervention(id: string, organizationId: string): Promise<InterventionResponse>;
  abstract updateIntervention(
    id: string,
    body: UpdateInterventionBody
  ): Promise<InterventionResponse>;
  abstract deleteIntervention(
    id: string,
    organizationId: string
  ): Promise<{ deleted: true }>;
  abstract getDashboard(
    organizationId: string,
    userId: string
  ): Promise<CaseDashboardResponse>;
}
