import { toInterventionResponse } from "./intervention.mapper";
import type { InterventionDocument } from "../../persistence/intervention.schema";

function doc(overrides: Partial<InterventionDocument> = {}): InterventionDocument {
  return {
    _id: { toString: () => "int-1" },
    organizationId: "org-1",
    caseId: "case-1",
    title: "Intervention",
    status: "completed",
    get: (key: string) => (key === "createdAt" ? new Date("2026-09-20") : undefined),
    ...overrides,
  } as InterventionDocument;
}

describe("toInterventionResponse fieldReport", () => {
  it("exposes JSON drafts as readable prose", () => {
    const report = JSON.stringify({
      date: "20/09/2026",
      type_intervention: "Pose",
      travaux_realises: "Intervention démo réalisée sur site.",
    });
    const result = toInterventionResponse(doc({ fieldReport: report }));
    expect(result.fieldReport).toBe("Intervention démo réalisée sur site.");
  });
});
