import {
  buildInterventionUpdateDetail,
  mapDocumentEntityType,
} from "../notification-event-details";

describe("notification-event-details", () => {
  describe("mapDocumentEntityType", () => {
    it("maps document host entity types to notification entity types", () => {
      expect(mapDocumentEntityType("case")).toBe("case");
      expect(mapDocumentEntityType("customer")).toBe("customer");
    });
  });

  describe("buildInterventionUpdateDetail", () => {
    it("summarizes changed intervention fields in French", () => {
      expect(
        buildInterventionUpdateDetail({
          title: "Nouveau titre",
          scheduledStart: "2026-06-06T09:00:00.000Z",
        }),
      ).toBe("titre modifié, planning modifié");
    });

    it("returns undefined when body has no recognized fields", () => {
      expect(buildInterventionUpdateDetail({ organizationId: "org-1" })).toBeUndefined();
    });
  });
});
