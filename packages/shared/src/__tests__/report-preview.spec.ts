import { isReportEntityRef, isReportPreviewType, REPORT_PREVIEW_TYPES } from "../report-preview";

describe("report-preview", () => {
  it("validates report types", () => {
    expect(isReportPreviewType("cases_list")).toBe(true);
    expect(isReportPreviewType("unknown")).toBe(false);
    expect(REPORT_PREVIEW_TYPES).toContain("technicians_activity");
  });

  it("detects entity ref cells", () => {
    expect(isReportEntityRef({ kind: "case", id: "1", label: "Dossier" })).toBe(true);
    expect(isReportEntityRef("texte")).toBe(false);
    expect(isReportEntityRef(null)).toBe(false);
    expect(isReportEntityRef(12)).toBe(false);
  });
});
