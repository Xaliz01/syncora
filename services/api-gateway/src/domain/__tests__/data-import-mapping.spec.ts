import { DATA_IMPORT_TARGET_FIELDS } from "@planwise/shared";
import {
  buildHeuristicMapping,
  fillMappingGaps,
  mappingConfidence,
  sanitizeMapping,
} from "../data-import-mapping";

describe("data-import-mapping", () => {
  it("does not expose title as a target field for cases", () => {
    const keys = DATA_IMPORT_TARGET_FIELDS.cases.map((f) => f.key);
    expect(keys).not.toContain("title");
    expect(keys).toContain("reference");
    expect(keys).toContain("externalId");

    const mapping = buildHeuristicMapping("cases", ["id", "title", "titre", "référence", "client"]);
    expect(mapping).not.toHaveProperty("title");
    expect(mapping.reference).toBe("référence");
    expect(sanitizeMapping("cases", ["id", "title"], { title: "title", externalId: "id" })).toEqual(
      expect.objectContaining({ externalId: "id" }),
    );
    expect(
      sanitizeMapping("cases", ["id", "title"], { title: "title", externalId: "id" }),
    ).not.toHaveProperty("title");
  });

  it("maps French CRM headers heuristically for customers", () => {
    const mapping = buildHeuristicMapping("customers", [
      "Code client",
      "Raison sociale",
      "Email",
      "Téléphone",
      "Ville",
      "Code postal",
      "Adresse",
    ]);
    expect(mapping.externalId).toBe("Code client");
    expect(mapping.companyName).toBe("Raison sociale");
    expect(mapping.email).toBe("Email");
    expect(mapping.phone).toBe("Téléphone");
    expect(mapping.city).toBe("Ville");
    expect(mapping.postalCode).toBe("Code postal");
    expect(mapping.addressLine1).toBe("Adresse");
    expect(mapping.kind).toBeNull();
    expect(mappingConfidence("customers", mapping)).toBe("low");
  });

  it("sanitizes unknown fields and duplicate sources", () => {
    const headers = ["A", "B"];
    const sanitized = sanitizeMapping("customers", headers, {
      externalId: "A",
      email: "A",
      bogus: "B",
      companyName: "missing",
      phone: "B",
    });
    expect(sanitized.externalId).toBe("A");
    expect(sanitized.email).toBeNull();
    expect(sanitized.phone).toBe("B");
    expect(sanitized.companyName).toBeNull();
    expect((sanitized as Record<string, unknown>).bogus).toBeUndefined();
  });

  it("fills mapping gaps without overwriting", () => {
    const headers = ["id", "mail", "ville"];
    const empty: Record<string, string | null> = Object.fromEntries(
      DATA_IMPORT_TARGET_FIELDS.customers.map((f) => [f.key, null]),
    );
    empty.email = "mail";
    const filled = fillMappingGaps("customers", headers, empty);
    expect(filled.email).toBe("mail");
    expect(filled.externalId).toBe("id");
    expect(filled.city).toBe("ville");
  });
});
