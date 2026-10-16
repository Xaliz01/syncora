import { buildPappersSearchCacheKey, PappersSearchCache } from "../pappers-search-cache";
import type { PlatformProspectsSearchResponse } from "@planwise/shared";

describe("PappersSearchCache", () => {
  it("returns a deep copy marked fromCache", () => {
    const cache = new PappersSearchCache(60_000);
    const value: PlatformProspectsSearchResponse = {
      results: [
        {
          siren: "123456789",
          name: "Demo",
          alreadyContacted: false,
          emailNotFound: false,
        },
      ],
      total: 1,
      page: 1,
      perPage: 20,
      sort: "created_at_desc",
    };
    cache.set("k1", value);
    const hit = cache.get("k1");
    expect(hit?.fromCache).toBe(true);
    expect(hit?.results[0]?.name).toBe("Demo");
    if (hit?.results[0]) hit.results[0].name = "Mutated";
    expect(cache.get("k1")?.results[0]?.name).toBe("Demo");
  });

  it("expires entries after TTL", () => {
    const cache = new PappersSearchCache(-1);
    cache.set("k1", {
      results: [],
      total: 0,
      page: 1,
      perPage: 20,
    });
    expect(cache.get("k1")).toBeUndefined();
  });

  it("builds a stable cache key", () => {
    expect(
      buildPappersSearchCacheKey({
        preset: "artisans_terrain",
        page: 3,
        perPage: 20,
        sort: "created_at_desc",
        dateCreationMin: "06-08-2025",
        departement: "29",
      }),
    ).toBe("artisans_terrain||29|3|20|created_at_desc|06-08-2025");
  });
});
