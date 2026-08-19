import { buildPersonSearchOr, escapeRegex } from "../person-search.query";

describe("person-search.query", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex("a+b")).toBe("a\\+b");
  });

  it("builds simple OR for a single token", () => {
    const clauses = buildPersonSearchOr("Moulin");
    expect(clauses).toEqual(
      expect.arrayContaining([
        { lastName: { $regex: "Moulin", $options: "i" } },
        { firstName: { $regex: "Moulin", $options: "i" } },
      ]),
    );
    expect(clauses.some((c) => "$and" in c)).toBe(false);
  });

  it("includes address fields for a single token", () => {
    const clauses = buildPersonSearchOr("75015");
    expect(clauses).toEqual(
      expect.arrayContaining([
        { "address.postalCode": { $regex: "75015", $options: "i" } },
        { "address.city": { $regex: "75015", $options: "i" } },
        { "sites.address.postalCode": { $regex: "75015", $options: "i" } },
      ]),
    );
  });

  it("requires each token to match identity fields for multi-word queries", () => {
    const clauses = buildPersonSearchOr("Jean Moulin");
    const andClause = clauses.find((c) => "$and" in c) as {
      $and: Array<{ $or: Array<Record<string, unknown>> }>;
    };
    expect(andClause).toBeDefined();
    expect(andClause.$and).toHaveLength(2);
    expect(andClause.$and[0].$or).toEqual(
      expect.arrayContaining([
        { firstName: { $regex: "Jean", $options: "i" } },
        { "address.line1": { $regex: "Jean", $options: "i" } },
        { "sites.address.city": { $regex: "Jean", $options: "i" } },
      ]),
    );
    expect(andClause.$and[1].$or).toEqual(
      expect.arrayContaining([{ lastName: { $regex: "Moulin", $options: "i" } }]),
    );
  });
});
