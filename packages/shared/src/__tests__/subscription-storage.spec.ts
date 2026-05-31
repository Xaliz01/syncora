import {
  BASE_SUBSCRIPTION_STORAGE_BYTES,
  computeOrganizationStorageQuotaBytes,
  EXTRA_STORAGE_PACK_BYTES,
  formatStorageBytes,
  isStorageQuotaExceeded,
  isStorageQuotaWarning,
  STORAGE_QUOTA_WARNING_RATIO,
} from "../subscription";

describe("subscription storage", () => {
  it("should grant 10 GiB in the base plan", () => {
    expect(computeOrganizationStorageQuotaBytes({})).toBe(BASE_SUBSCRIPTION_STORAGE_BYTES);
    expect(BASE_SUBSCRIPTION_STORAGE_BYTES).toBe(10 * 1024 ** 3);
  });

  it("should add 50 GiB per extra_storage pack", () => {
    expect(computeOrganizationStorageQuotaBytes({ extra_storage: 2 })).toBe(
      BASE_SUBSCRIPTION_STORAGE_BYTES + 2 * EXTRA_STORAGE_PACK_BYTES,
    );
  });

  it("should detect warning at 80% threshold", () => {
    const quota = 1000;
    const threshold = quota * STORAGE_QUOTA_WARNING_RATIO;
    expect(isStorageQuotaWarning(threshold - 1, quota)).toBe(false);
    expect(isStorageQuotaWarning(threshold, quota)).toBe(true);
  });

  it("should detect quota exceeded on upload", () => {
    expect(isStorageQuotaExceeded(900, 101, 1000)).toBe(true);
    expect(isStorageQuotaExceeded(900, 100, 1000)).toBe(false);
  });

  it("should format storage for display", () => {
    expect(formatStorageBytes(512)).toContain("o");
    expect(formatStorageBytes(5 * 1024 ** 3)).toMatch(/^5 Go$/);
  });
});
