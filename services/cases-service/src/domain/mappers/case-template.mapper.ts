import type { CaseTemplateResponse } from "@planwise/shared";
import type { CaseTemplateDocument } from "../../persistence/case-template.schema";

export function toTemplateResponse(doc: CaseTemplateDocument): CaseTemplateResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description,
    steps: (doc.steps ?? []).map((s) => ({
      name: s.name,
      description: s.description,
      order: s.order,
      todos: (s.todos ?? []).map((t) => ({
        label: t.label,
        description: t.description,
        dashboardRule: t.dashboardRule
          ? {
              showOnDashboard: t.dashboardRule.showOnDashboard,
              visibility: t.dashboardRule.visibility,
              profileIds: t.dashboardRule.profileIds,
              userIds: t.dashboardRule.userIds,
            }
          : undefined,
      })),
    })),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
