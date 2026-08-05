import type { AuthUser } from "@planwise/shared";

export interface SearchResultItem {
  id: string;
  type:
    | "case"
    | "intervention"
    | "customer"
    | "order_giver"
    | "vehicle"
    | "technician"
    | "team"
    | "agence"
    | "article"
    | "prestation"
    | "user";
  title: string;
  subtitle?: string;
  url: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
  counts: Record<string, number>;
}

export abstract class AbstractSearchService {
  abstract search(user: AuthUser, query: string): Promise<GlobalSearchResponse>;
}
