import type { PlatformProspectsSearchResponse } from "@planwise/shared";

const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12 h
const MAX_ENTRIES = 100;

type CacheEntry = {
  expiresAt: number;
  value: PlatformProspectsSearchResponse;
};

/**
 * Cache mémoire process-local des pages de recherche Pappers.
 * Évite de reconsommer des crédits sur la même requête (filtres + page).
 */
export class PappersSearchCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = MAX_ENTRIES,
  ) {}

  get(key: string): PlatformProspectsSearchResponse | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return {
      ...entry.value,
      results: entry.value.results.map((r) => ({ ...r })),
      fromCache: true,
    };
  }

  set(key: string, value: PlatformProspectsSearchResponse): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      value: {
        results: value.results.map((r) => ({ ...r })),
        total: value.total,
        page: value.page,
        perPage: value.perPage,
        ...(value.sort ? { sort: value.sort } : {}),
      },
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export function buildPappersSearchCacheKey(parts: {
  preset?: string;
  codeNaf?: string;
  departement?: string;
  page: number;
  perPage: number;
  sort: string;
  dateCreationMin: string;
}): string {
  return [
    parts.preset?.trim() || "",
    parts.codeNaf?.trim() || "",
    parts.departement?.trim() || "",
    String(parts.page),
    String(parts.perPage),
    parts.sort,
    parts.dateCreationMin,
  ].join("|");
}
