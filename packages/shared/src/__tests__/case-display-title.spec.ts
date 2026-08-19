import { buildCaseDisplayTitle } from "../case";

describe("buildCaseDisplayTitle", () => {
  it("returns number only without party label", () => {
    expect(buildCaseDisplayTitle("2026-0001")).toBe("2026-0001");
    expect(buildCaseDisplayTitle("2026-0001", null)).toBe("2026-0001");
    expect(buildCaseDisplayTitle("2026-0001", "  ")).toBe("2026-0001");
  });

  it("appends party label", () => {
    expect(buildCaseDisplayTitle("2026-0001", "Dupont SARL")).toBe("2026-0001 - Dupont SARL");
  });
});
