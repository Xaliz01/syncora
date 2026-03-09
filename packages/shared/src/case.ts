/** API contracts for cases-service (templates, cases, interventions) */

// ── Statuses ──

export type CaseStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "waiting"
  | "completed"
  | "cancelled";

export type InterventionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TodoItemStatus = "pending" | "done" | "skipped";
export type CasePriority = "low" | "medium" | "high" | "urgent";

// ── Case templates ──

export interface TemplateStepTodo {
  label: string;
  description?: string;
}

export interface TemplateStep {
  name: string;
  description?: string;
  order: number;
  todos: TemplateStepTodo[];
}

export interface CreateCaseTemplateBody {
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
}

export interface UpdateCaseTemplateBody {
  organizationId: string;
  name?: string;
  description?: string;
  steps?: TemplateStep[];
}

export interface CaseTemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
  createdAt?: string;
  updatedAt?: string;
}

// ── Case ──

export interface CaseTodoItem {
  id: string;
  label: string;
  description?: string;
  status: TodoItemStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface CaseStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  todos: CaseTodoItem[];
}

export interface CreateCaseBody {
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  priority?: CasePriority;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateCaseBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: CasePriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
}

export interface CaseResponse {
  id: string;
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  tags: string[];
  steps: CaseStep[];
  progress: number;
  interventionCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseSummaryResponse {
  id: string;
  organizationId: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  tags: string[];
  progress: number;
  interventionCount: number;
  nextTodo?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Intervention ──

export interface CreateInterventionBody {
  organizationId: string;
  caseId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignedTeamId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: InterventionStatus;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export interface InterventionResponse {
  id: string;
  organizationId: string;
  caseId: string;
  caseTitle?: string;
  title: string;
  description?: string;
  status: InterventionStatus;
  assigneeId?: string;
  assigneeName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Todo actions ──

export interface UpdateTodoBody {
  organizationId: string;
  stepId: string;
  todoId: string;
  status: TodoItemStatus;
}

// ── Dashboard ──

export interface CaseDashboardResponse {
  assignedCases: CaseSummaryResponse[];
  upcomingInterventions: InterventionResponse[];
  overdueCases: CaseSummaryResponse[];
  stats: {
    totalAssigned: number;
    inProgress: number;
    completedThisWeek: number;
    overdue: number;
  };
}
