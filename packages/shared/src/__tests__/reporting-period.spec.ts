import {
  defaultReportingPeriod,
  getReportingPeriodError,
  parseReportingPeriod,
  reportingPeriodFilenameSuffix,
  ReportingPeriodError,
} from "../reporting-period";

describe("reporting-period", () => {
  it("defaults to a one-month window ending today (local calendar)", () => {
    const period = defaultReportingPeriod(new Date(2026, 6, 18, 15, 0, 0));
    expect(period).toEqual({ startDate: "2026-06-18", endDate: "2026-07-18" });
  });

  it("requires both dates", () => {
    expect(getReportingPeriodError("", "2026-01-31")).toMatch(/obligatoire/);
    expect(getReportingPeriodError("2026-01-01", undefined)).toMatch(/obligatoire/);
  });

  it("rejects inverted and >2 years ranges", () => {
    expect(getReportingPeriodError("2026-02-01", "2026-01-01")).toMatch(/antérieure/);
    expect(getReportingPeriodError("2024-01-01", "2026-01-02")).toMatch(/2 ans/);
    expect(getReportingPeriodError("2024-01-01", "2026-01-01")).toBeNull();
  });

  it("parseReportingPeriod throws ReportingPeriodError", () => {
    expect(() => parseReportingPeriod()).toThrow(ReportingPeriodError);
    expect(parseReportingPeriod("2026-01-01", "2026-01-31")).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
  });

  it("builds filename suffix", () => {
    expect(reportingPeriodFilenameSuffix("2026-01-01", "2026-01-31")).toBe(
      "_2026-01-01_2026-01-31",
    );
  });
});
