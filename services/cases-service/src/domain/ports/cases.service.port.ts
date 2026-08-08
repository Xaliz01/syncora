import type {
  CaseResponse,
  CasesListResponse,
  CaseTemplateResponse,
  CreateCaseBody,
  CreateInterventionBody,
  InterventionResponse,
  UpdateCaseBody,
  UpdateTodoBody,
} from "@planwise/shared";

export abstract class AbstractCasesService {
  abstract createCase(body: CreateCaseBody): Promise<CaseResponse>;
  abstract listCases(
    organizationId: string,
    filters?: {
      status?: string;
      billingStatus?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      customerId?: string;
      orderGiverId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<CasesListResponse>;
  abstract getCase(id: string, organizationId: string): Promise<CaseResponse>;
  /** IDs bruts (max 1000) pour filtrer factures / agrégats par partie. */
  abstract listCaseIds(
    organizationId: string,
    filters: { customerId?: string; orderGiverId?: string },
  ): Promise<string[]>;
  abstract updateCase(id: string, body: UpdateCaseBody): Promise<CaseResponse>;
  abstract deleteCase(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract updateTodo(caseId: string, body: UpdateTodoBody): Promise<CaseResponse>;
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;

  /** Used by MaintenanceContractsService — delegates to InterventionsService logic. */
  abstract createIntervention(body: CreateInterventionBody): Promise<InterventionResponse>;
  /** Used by MaintenanceContractsService — delegates to CaseTemplatesService logic. */
  abstract getTemplate(id: string, organizationId: string): Promise<CaseTemplateResponse>;
}
