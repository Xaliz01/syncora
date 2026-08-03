import { buildDemoInterventions } from "../trial-test-data-seed";

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
});
