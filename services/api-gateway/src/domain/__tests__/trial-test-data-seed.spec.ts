import { buildDemoInterventionTypes, buildDemoInterventions } from "../trial-test-data-seed";
import { DEFAULT_INTERVENTION_TYPE_PRESETS } from "@planwise/shared";

describe("buildDemoInterventionTypes", () => {
  it("crée Pose et SAV comme le catalogue par défaut", () => {
    const types = buildDemoInterventionTypes("org-1");
    expect(types).toHaveLength(DEFAULT_INTERVENTION_TYPE_PRESETS.length);
    expect(types.map((t) => t.name)).toEqual(DEFAULT_INTERVENTION_TYPE_PRESETS.map((p) => p.name));
    expect(types.every((t) => t.isTestData === true && t.organizationId === "org-1")).toBe(true);
  });
});

describe("buildDemoInterventions", () => {
  it("assigns either a technician or a team, never both", () => {
    const interventions = buildDemoInterventions(
      "org-1",
      Array.from({ length: 10 }, (_, i) => `case-${i}`),
      ["team-a", "team-b"],
      { assigneeTechnicianId: "tech-admin", userCaseCount: 3 },
    );

    expect(interventions).toHaveLength(10);
    for (const [index, intervention] of interventions.entries()) {
      const hasAssignee = Boolean(intervention.assigneeId);
      const hasTeam = Boolean(intervention.assignedTeamId);
      expect(hasAssignee && hasTeam).toBe(false);
      if (index < 3) {
        expect(intervention.assigneeId).toBe("tech-admin");
        expect(intervention.assignedTeamId).toBeUndefined();
      } else {
        expect(intervention.assigneeId).toBeUndefined();
        expect(intervention.assignedTeamId).toBeDefined();
      }
    }
  });

  it("alterne les types d’intervention fournis", () => {
    const interventions = buildDemoInterventions(
      "org-1",
      Array.from({ length: 4 }, (_, i) => `case-${i}`),
      ["team-a"],
      { interventionTypeIds: ["type-pose", "type-sav"] },
    );

    expect(interventions.map((i) => i.typeId)).toEqual([
      "type-pose",
      "type-sav",
      "type-pose",
      "type-sav",
    ]);
  });
});
