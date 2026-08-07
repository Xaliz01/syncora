import { sanitizePdfText } from "../pdf-text";

describe("sanitizePdfText", () => {
  it("replaces white circle that PDFKit encodes as %Ë", () => {
    expect(sanitizePdfText("  ○ Tâche")).toBe("  [ ] Tâche");
  });

  it("replaces checkmark and arrows", () => {
    expect(sanitizePdfText("✓ done → next")).toBe("[x] done -> next");
  });

  it("keeps French accents and percent", () => {
    expect(sanitizePdfText("Priorité : Haute | Avancement : 42%")).toBe(
      "Priorité : Haute | Avancement : 42%",
    );
  });

  it("keeps euro and em dash mapped by WinAnsi", () => {
    expect(sanitizePdfText("12,50 € — Planwise")).toBe("12,50 € — Planwise");
  });

  it("strips unsupported unicode", () => {
    expect(sanitizePdfText("hello 😀")).toBe("hello ?");
  });

  it("does not turn percent into corrupted glyphs", () => {
    // Régression : ○ (U+25CB) était encodé 0x25 0xCB → « %Ë »
    expect(sanitizePdfText("○")).not.toContain("%");
    expect(sanitizePdfText("Avancement : 42%")).toContain("42%");
  });
});
