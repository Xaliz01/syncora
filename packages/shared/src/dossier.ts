/** Contrats API dossiers-service (modèles, dossiers, interventions) */

// ── Statuts ──

export type DossierStatus =
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
export type DossierPriority = "low" | "medium" | "high" | "urgent";

// ── Modèles de dossier (templates) ──

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

export interface CreateDossierTemplateBody {
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
}

export interface UpdateDossierTemplateBody {
  organizationId: string;
  name?: string;
  description?: string;
  steps?: TemplateStep[];
}

export interface DossierTemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
  createdAt?: string;
  updatedAt?: string;
}

// ── Dossier ──

export interface DossierTodoItem {
  id: string;
  label: string;
  description?: string;
  status: TodoItemStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface DossierStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  todos: DossierTodoItem[];
}

export interface CreateDossierBody {
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  priority?: DossierPriority;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateDossierBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: DossierStatus;
  priority?: DossierPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
}

export interface DossierResponse {
  id: string;
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  status: DossierStatus;
  priority: DossierPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  tags: string[];
  steps: DossierStep[];
  progress: number;
  interventionCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DossierSummaryResponse {
  id: string;
  organizationId: string;
  title: string;
  status: DossierStatus;
  priority: DossierPriority;
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
  dossierId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: InterventionStatus;
  assigneeId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export interface InterventionResponse {
  id: string;
  organizationId: string;
  dossierId: string;
  dossierTitle?: string;
  title: string;
  description?: string;
  status: InterventionStatus;
  assigneeId?: string;
  assigneeName?: string;
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

export interface DashboardResponse {
  assignedDossiers: DossierSummaryResponse[];
  upcomingInterventions: InterventionResponse[];
  overdueDossiers: DossierSummaryResponse[];
  stats: {
    totalAssigned: number;
    inProgress: number;
    completedThisWeek: number;
    overdue: number;
  };
}
