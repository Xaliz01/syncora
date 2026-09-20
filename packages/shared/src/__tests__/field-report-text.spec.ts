import { normalizeFieldReportText } from "../field-report-text";

describe("normalizeFieldReportText", () => {
  it("extracts travaux_realises from a JSON object", () => {
    const raw = JSON.stringify({
      date: "20/09/2026",
      type_intervention: "Pose",
      travaux_realises:
        "Intervention démo #1 réalisée sur le site des Bâtiments Dupont 1. L'intervention a été démarrée à 20h41 et terminée à 20h42.",
    });
    expect(normalizeFieldReportText(raw)).toBe(
      "Intervention démo #1 réalisée sur le site des Bâtiments Dupont 1. L'intervention a été démarrée à 20h41 et terminée à 20h42.",
    );
  });

  it("unwraps a markdown JSON fence", () => {
    expect(normalizeFieldReportText('```json\n{"report":"Travaux OK."}\n```')).toBe("Travaux OK.");
  });

  it("leaves plain prose unchanged", () => {
    const prose = "Pose réalisée le 20/09/2026. Travaux conformes.";
    expect(normalizeFieldReportText(prose)).toBe(prose);
  });

  it("returns empty for blank input", () => {
    expect(normalizeFieldReportText("  ")).toBe("");
    expect(normalizeFieldReportText(undefined)).toBe("");
  });

  it("keeps invalid JSON-looking text", () => {
    expect(normalizeFieldReportText("{pas du json}")).toBe("{pas du json}");
  });
});
