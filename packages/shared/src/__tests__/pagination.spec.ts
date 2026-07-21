import { clampPagination, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../pagination";

describe("clampPagination", () => {
  it("applies defaults", () => {
    expect(clampPagination()).toEqual({ limit: DEFAULT_PAGE_LIMIT, offset: 0 });
  });

  it("clamps to max and floors offset", () => {
    expect(clampPagination({ limit: 999, offset: -5 }, { maxLimit: MAX_PAGE_LIMIT })).toEqual({
      limit: MAX_PAGE_LIMIT,
      offset: 0,
    });
  });

  it("accepts valid values", () => {
    expect(clampPagination({ limit: 25, offset: 50 })).toEqual({ limit: 25, offset: 50 });
  });
});
