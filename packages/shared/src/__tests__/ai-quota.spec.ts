import { AI_QUOTA_LIMITS, AI_USAGE_KEYS, getAiQuotaLimit, isValidAiUsageKey } from "../ai-quota";

describe("AI Quota", () => {
  it("returns correct limits for each tier", () => {
    expect(getAiQuotaLimit("field_report", "trial")).toBe(20);
    expect(getAiQuotaLimit("field_report", "essential")).toBe(15);
    expect(getAiQuotaLimit("field_report", "copilot")).toBe(120);
  });

  it("validates usage keys", () => {
    expect(isValidAiUsageKey("field_report")).toBe(true);
    expect(isValidAiUsageKey("org_read_question")).toBe(true);
    expect(isValidAiUsageKey("unknown")).toBe(false);
    expect(isValidAiUsageKey("")).toBe(false);
  });

  it("all usage keys have limits defined", () => {
    for (const key of AI_USAGE_KEYS) {
      const limits = AI_QUOTA_LIMITS[key];
      expect(limits.trial).toBeGreaterThan(0);
      expect(limits.copilot).toBeGreaterThan(0);
      expect(limits.essential).toBeGreaterThanOrEqual(0);
    }
  });
});
