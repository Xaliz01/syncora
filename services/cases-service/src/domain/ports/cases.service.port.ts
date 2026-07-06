import type {
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CreateCaseHistoryBody,
  CaseDashboardResponse,
  CaseHistoryEntryResponse,
  CaseResponse,
  CaseSummaryResponse,
  CompleteInterventionBody,
  CompleteInterventionResponse,
  CaseTemplateResponse,
  DashboardStatFilter,
  DashboardTodoCaseItem,
  InterventionResponse,
  SignInterventionBody,
  SignInterventionResponse,
  StartInterventionBody,
  StartInterventionResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
} from "@planwise/shared";

export abstract class AbstractCasesService {
  abstract createTemplate(body: CreateCaseTemplateBody): Promise<CaseTemplateResponse>;
  abstract listTemplates(organizationId: string): Promise<CaseTemplateResponse[]>;
  abstract getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse>;
  abstract updateTemplate(id: string, body: UpdateCaseTemplateBody): Promise<CaseTemplateResponse>;
  abstract deleteTemplate(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract createCase(body: CreateCaseBody): Promise<CaseResponse>;
  abstract listCases(
    organizationId: string,
    filters?: {
      status?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      customerId?: string;
    },
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
      assignedTeamIds?: string[];
      startDate?: string;
      endDate?: string;
      status?: string;
      /** Sans créneau horaire (scheduledStart absent ou null) */
      unscheduled?: boolean;
    },
  ): Promise<InterventionResponse[]>;
  abstract getIntervention(id: string, organizationId: string): Promise<InterventionResponse>;
  abstract updateIntervention(
    id: string,
    body: UpdateInterventionBody,
  ): Promise<InterventionResponse>;
  abstract deleteIntervention(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract startIntervention(
    id: string,
    body: StartInterventionBody,
  ): Promise<StartInterventionResponse>;
  abstract completeIntervention(
    id: string,
    body: CompleteInterventionBody,
  ): Promise<CompleteInterventionResponse>;
  abstract signIntervention(
    id: string,
    body: SignInterventionBody,
  ): Promise<SignInterventionResponse>;
  abstract getInterventionWithSignature(
    id: string,
    organizationId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }>;
  abstract getDashboard(
    organizationId: string,
    userId: string,
    userProfileId?: string,
  ): Promise<CaseDashboardResponse>;
  abstract getDashboardTodoCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]>;
  abstract getDashboardStatCases(
    organizationId: string,
    userId: string,
    userProfileId: string | undefined,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]>;
  abstract listUpcomingInterventions(from: string, to: string): Promise<InterventionResponse[]>;
  abstract addCaseHistory(body: CreateCaseHistoryBody): Promise<CaseHistoryEntryResponse>;
  abstract listCaseHistory(
    caseId: string,
    organizationId: string,
  ): Promise<CaseHistoryEntryResponse[]>;
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;
}
