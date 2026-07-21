/** Pagination offset/limit — contrat unique app + backoffice. */

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;
/** Calendriers, exports, plages de dates bornées. */
export const MAX_PAGE_LIMIT_WIDE = 500;

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function clampPagination(
  input?: PaginationQuery,
  options?: { defaultLimit?: number; maxLimit?: number },
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_PAGE_LIMIT;
  const maxLimit = options?.maxLimit ?? MAX_PAGE_LIMIT;
  const rawLimit = input?.limit;
  const rawOffset = input?.offset;
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) ? Number(rawLimit) : defaultLimit, 1),
    maxLimit,
  );
  const offset = Math.max(Number.isFinite(rawOffset) ? Number(rawOffset) : 0, 0);
  return { limit, offset };
}

/** Parse les query string Nest (`limit` / `offset`). */
export function parsePaginationQueryParams(
  limit?: string,
  offset?: string,
  options?: { defaultLimit?: number; maxLimit?: number },
): PaginationParams {
  const parsedLimit = limit != null && limit !== "" ? Number.parseInt(limit, 10) : Number.NaN;
  const parsedOffset = offset != null && offset !== "" ? Number.parseInt(offset, 10) : Number.NaN;
  return clampPagination(
    {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    },
    options,
  );
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
}
