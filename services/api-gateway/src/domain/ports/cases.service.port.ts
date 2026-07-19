import type {
  AuthUser,
  CaseDashboardResponse,
  CaseHistoryEntryResponse,
  CaseResponse,
  CaseSummaryResponse,
  CompleteInterventionResponse,
  CaseTemplateResponse,
  DashboardStatFilter,
  GeoLocation,
  DashboardTodoCaseItem,
  InterventionResponse,
  QuoteResponse,
  QuoteSummaryResponse,
  SignInterventionResponse,
  StartInterventionResponse,
  TodoDashboardVisibility,
  CommentResponse,
  CommentEntityType,
} from "@planwise/shared";

export interface CreateCaseForOrgBody {
  templateId?: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: string;
  tags?: string[];
  customerId?: string;
  interventionSiteId?: string;
}

export interface UpdateCaseForOrgBody {
  title?: string;
  description?: string;
  status?: string;
  billingStatus?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
  tags?: string[];
  customerId?: string | null;
  interventionSiteId?: string | null;
}

export interface CreateTemplateForOrgBody {
  name: string;
  description?: string;
  steps: {
    name: string;
    description?: string;
    order: number;
    todos: {
      label: string;
      description?: string;
      dashboardRule?: {
        showOnDashboard: boolean;
        visibility?: TodoDashboardVisibility;
        profileIds?: string[];
        userIds?: string[];
      };
    }[];
  }[];
}

export interface UpdateTemplateForOrgBody {
  name?: string;
  description?: string;
  steps?: {
    name: string;
    description?: string;
    order: number;
    todos: {
      label: string;
      description?: string;
      dashboardRule?: {
        showOnDashboard: boolean;
        visibility?: TodoDashboardVisibility;
        profileIds?: string[];
        userIds?: string[];
      };
    }[];
  }[];
}

export interface CreateInterventionForOrgBody {
  caseId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignedTeamId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionForOrgBody {
  title?: string;
  description?: string;
  status?: string;
  billingStatus?: string;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export interface UpdateTodoForOrgBody {
  stepId: string;
  todoId: string;
  status: string;
}

export interface StartInterventionForOrgBody {
  location?: GeoLocation;
}

export interface CompleteInterventionForOrgBody {
  notes?: string;
  location?: GeoLocation;
}

export interface SignInterventionForOrgBody {
  signatoryName: string;
  signatureData: string;
}

export interface CreateQuoteForOrgBody {
  caseId: string;
  subject?: string;
  notes?: string;
  validUntil?: string;
  lines: {
    articleId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    unit?: string;
  }[];
}

export interface UpdateQuoteForOrgBody {
  subject?: string;
  notes?: string;
  status?: string;
  validUntil?: string | null;
  lines?: {
    articleId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    unit?: string;
  }[];
}

export interface CreateCommentForOrgBody {
  entityType: CommentEntityType;
  entityId: string;
  body: string;
}

export interface UpdateCommentForOrgBody {
  body: string;
}

export abstract class AbstractCasesGatewayService {
  abstract createTemplate(
    user: AuthUser,
    body: CreateTemplateForOrgBody,
  ): Promise<CaseTemplateResponse>;
  abstract listTemplates(user: AuthUser): Promise<CaseTemplateResponse[]>;
  abstract getTemplate(user: AuthUser, templateId: string): Promise<CaseTemplateResponse>;
  abstract updateTemplate(
    user: AuthUser,
    templateId: string,
    body: UpdateTemplateForOrgBody,
  ): Promise<CaseTemplateResponse>;
  abstract deleteTemplate(user: AuthUser, templateId: string): Promise<{ deleted: true }>;
  abstract createCase(user: AuthUser, body: CreateCaseForOrgBody): Promise<CaseResponse>;
  abstract listCases(
    user: AuthUser,
    filters?: {
      status?: string;
      billingStatus?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      customerId?: string;
    },
  ): Promise<CaseSummaryResponse[]>;
  abstract getCase(user: AuthUser, caseId: string): Promise<CaseResponse>;
  abstract updateCase(
    user: AuthUser,
    caseId: string,
    body: UpdateCaseForOrgBody,
  ): Promise<CaseResponse>;
  abstract deleteCase(user: AuthUser, caseId: string): Promise<{ deleted: true }>;
  abstract updateTodo(
    user: AuthUser,
    caseId: string,
    body: UpdateTodoForOrgBody,
  ): Promise<CaseResponse>;
  abstract createIntervention(
    user: AuthUser,
    body: CreateInterventionForOrgBody,
  ): Promise<InterventionResponse>;
  abstract listInterventions(
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
  ): Promise<InterventionResponse[]>;
  abstract getIntervention(user: AuthUser, interventionId: string): Promise<InterventionResponse>;
  abstract updateIntervention(
    user: AuthUser,
    interventionId: string,
    body: UpdateInterventionForOrgBody,
  ): Promise<InterventionResponse>;
  abstract deleteIntervention(user: AuthUser, interventionId: string): Promise<{ deleted: true }>;
  abstract startIntervention(
    user: AuthUser,
    interventionId: string,
    body: StartInterventionForOrgBody,
  ): Promise<StartInterventionResponse>;
  abstract completeIntervention(
    user: AuthUser,
    interventionId: string,
    body: CompleteInterventionForOrgBody,
  ): Promise<CompleteInterventionResponse>;
  abstract signIntervention(
    user: AuthUser,
    interventionId: string,
    body: SignInterventionForOrgBody,
  ): Promise<SignInterventionResponse>;
  abstract generateInterventionReport(user: AuthUser, interventionId: string): Promise<Buffer>;
  abstract getDashboard(user: AuthUser): Promise<CaseDashboardResponse>;
  abstract getDashboardTodoCases(
    user: AuthUser,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]>;
  abstract getDashboardStatCases(
    user: AuthUser,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]>;
  abstract listCaseHistory(user: AuthUser, caseId: string): Promise<CaseHistoryEntryResponse[]>;
  abstract createQuote(user: AuthUser, body: CreateQuoteForOrgBody): Promise<QuoteResponse>;
  abstract listQuotes(
    user: AuthUser,
    filters?: { caseId?: string; status?: string },
  ): Promise<QuoteSummaryResponse[]>;
  abstract getQuote(user: AuthUser, quoteId: string): Promise<QuoteResponse>;
  abstract updateQuote(
    user: AuthUser,
    quoteId: string,
    body: UpdateQuoteForOrgBody,
  ): Promise<QuoteResponse>;
  abstract deleteQuote(user: AuthUser, quoteId: string): Promise<{ deleted: true }>;
  abstract generateQuotePdf(user: AuthUser, quoteId: string): Promise<Buffer>;

  abstract previewQuotePdf(user: AuthUser, body: CreateQuoteForOrgBody): Promise<Buffer>;

  abstract createComment(user: AuthUser, body: CreateCommentForOrgBody): Promise<CommentResponse>;
  abstract listComments(
    user: AuthUser,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentResponse[]>;
  abstract updateComment(
    user: AuthUser,
    commentId: string,
    body: UpdateCommentForOrgBody,
  ): Promise<CommentResponse>;
  abstract deleteComment(user: AuthUser, commentId: string): Promise<{ deleted: true }>;
}
