import { parseCsv, validateHeaders, mapCustomerRows, assertCsvLimits } from "../data-import-csv";

describe("data-import-csv", () => {
  it("parses semicolon CSV with header", () => {
    const csv = "externalId;kind;companyName\nCLI-1;company;Acme\nCLI-2;individual;";
    const parsed = parseCsv(csv);
    expect(parsed.headers).toEqual(["externalId", "kind", "companyName"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]!.externalId).toBe("CLI-1");
  });

  it("validates required headers for customers", () => {
    const errors = validateHeaders("customers", ["externalId"]);
    expect(errors.some((e) => e.field === "kind")).toBe(true);
  });

  it("maps customer rows", () => {
    const rows = mapCustomerRows([
      { externalId: "C1", kind: "company", companyName: "X", firstName: "", lastName: "" },
    ]);
    expect(rows[0]).toMatchObject({ externalId: "C1", kind: "company", companyName: "X" });
  });

  it("rejects too many rows", () => {
    expect(assertCsvLimits(25_001)?.severity).toBe("error");
    expect(assertCsvLimits(10)).toBeNull();
  });
});
