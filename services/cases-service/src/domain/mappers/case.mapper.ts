import type {
  CaseAssignee,
  CaseResponse,
  CaseSummaryResponse,
  DashboardTodoCaseItem,
} from "@planwise/shared";
import type { CaseDocument } from "../../persistence/case.schema";

export function resolveAssignees(doc: CaseDocument): CaseAssignee[] {
  const list = doc.assignees ?? [];
  if (list.length > 0) {
    return list.map((a) => ({ userId: a.userId, name: a.name }));
  }
  if (doc.assigneeId) {
    return [
      {
        userId: doc.assigneeId,
        name: doc.assigneeName?.trim() || doc.assigneeId,
      },
    ];
  }
  return [];
}

export function computeProgress(doc: CaseDocument): number {
  const allTodos = doc.steps.flatMap((s) => s.todos);
  if (allTodos.length === 0) return 0;
  const done = allTodos.filter((t) => t.status === "done" || t.status === "skipped").length;
  return Math.round((done / allTodos.length) * 100);
}

export function getNextTodo(doc: CaseDocument): string | undefined {
  for (const step of [...doc.steps].sort((a, b) => a.order - b.order)) {
    for (const todo of step.todos) {
      if (todo.status === "pending") return todo.label;
    }
  }
  return undefined;
}

export function toCaseResponse(doc: CaseDocument): CaseResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    templateId: doc.templateId,
    customerId: doc.customerId,
    orderGiverId: doc.orderGiverId,
    interventionSiteId: doc.interventionSiteId,
    caseNumber: doc.caseNumber,
    reference: doc.reference || undefined,
    importExternalId: doc.importExternalId || undefined,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    billingStatus: doc.billingStatus ?? "none",
    priority: doc.priority,
    assignees: resolveAssignees(doc),
    dueDate: doc.dueDate?.toISOString(),
    tags: doc.tags ?? [],
    steps: (doc.steps ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      order: s.order,
      todos: (s.todos ?? []).map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        status: t.status,
        completedAt: t.completedAt?.toISOString(),
        completedBy: t.completedBy,
      })),
    })),
    progress: computeProgress(doc),
    interventionCount: doc.interventionCount ?? 0,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}

export function toCaseSummary(doc: CaseDocument): CaseSummaryResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    customerId: doc.customerId,
    orderGiverId: doc.orderGiverId,
    interventionSiteId: doc.interventionSiteId,
    caseNumber: doc.caseNumber,
    reference: doc.reference || undefined,
    importExternalId: doc.importExternalId || undefined,
    title: doc.title,
    status: doc.status,
    billingStatus: doc.billingStatus ?? "none",
    priority: doc.priority,
    assignees: resolveAssignees(doc),
    dueDate: doc.dueDate?.toISOString(),
    tags: doc.tags ?? [],
    progress: computeProgress(doc),
    interventionCount: doc.interventionCount ?? 0,
    nextTodo: getNextTodo(doc),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}

export function toDashboardCaseListItem(doc: CaseDocument): DashboardTodoCaseItem {
  return {
    caseId: doc._id.toString(),
    caseTitle: doc.title,
    customerId: doc.customerId,
    customerName: undefined,
    status: doc.status,
    priority: doc.priority,
    createdAt: doc.get("createdAt")?.toISOString(),
    dueDate: doc.dueDate?.toISOString(),
  };
}
