import type { AuthUser } from "@syncora/shared";

export interface SearchResultItem {
  id: string;
  type: "case" | "intervention" | "vehicle" | "technician" | "article" | "user";
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
