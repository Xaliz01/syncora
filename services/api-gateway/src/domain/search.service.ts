import { Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CaseSummaryResponse,
  InterventionResponse,
  VehicleResponse,
  TechnicianResponse,
  ArticleResponse,
  UserResponse,
} from "@syncora/shared";
import {
  AbstractSearchService,
  type GlobalSearchResponse,
  type SearchResultItem,
} from "./ports/search.service.port";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class SearchGatewayService extends AbstractSearchService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  async search(user: AuthUser, query: string): Promise<GlobalSearchResponse> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { query, results: [], counts: {} };
    }

    const [cases, interventions, vehicles, technicians, articles, users] = await Promise.allSettled(
      [
        this.fetchCases(user),
        this.fetchInterventions(user),
        this.fetchVehicles(user),
        this.fetchTechnicians(user),
        this.fetchArticles(user),
        user.role === "admin" ? this.fetchUsers(user) : Promise.resolve([]),
      ],
    );

    const results: SearchResultItem[] = [];

    for (const c of this.settled(cases)) {
      const assigneeNames = c.assignees?.map((a) => a.name).filter(Boolean) ?? [];
      const assigneesText = assigneeNames.join(" ");
      if (
        this.matches(
          normalizedQuery,
          c.title,
          assigneesText,
          c.customer?.displayName,
          c.status,
          ...(c.tags ?? []),
        )
      ) {
        const assigneePart = assigneeNames.length ? ` · ${assigneeNames.join(", ")}` : "";
        results.push({
          id: c.id,
          type: "case",
          title: c.title,
          subtitle: `${this.caseStatusLabel(c.status)} · ${this.casePriorityLabel(c.priority)}${assigneePart}`,
          url: `/cases/${c.id}`,
        });
      }
    }

    for (const i of this.settled(interventions)) {
      if (
        this.matches(
          normalizedQuery,
          i.title,
          i.description,
          i.assigneeName,
          i.assignedTeamName,
          i.caseTitle,
          i.status,
        )
      ) {
        const who =
          [i.assigneeName, i.assignedTeamName ? `Équipe : ${i.assignedTeamName}` : undefined]
            .filter(Boolean)
            .join(" · ") || "";
        results.push({
          id: i.id,
          type: "intervention",
          title: i.title,
          subtitle: `${this.interventionStatusLabel(i.status)}${i.caseTitle ? ` · Dossier : ${i.caseTitle}` : ""}${who ? ` · ${who}` : ""}`,
          url: `/cases/${i.caseId}`,
        });
      }
    }

    for (const v of this.settled(vehicles)) {
      if (
        this.matches(
          normalizedQuery,
          v.registrationNumber,
          v.brand,
          v.model,
          v.type,
          v.vin,
          v.color,
        )
      ) {
        results.push({
          id: v.id,
          type: "vehicle",
          title: `${v.brand ?? ""} ${v.model ?? ""} – ${v.registrationNumber}`.trim(),
          subtitle: `${v.type} · ${this.vehicleStatusLabel(v.status)}`,
          url: `/fleet/vehicles/${v.id}`,
        });
      }
    }

    for (const t of this.settled(technicians)) {
      if (this.matches(normalizedQuery, t.firstName, t.lastName, t.email, t.phone, t.speciality)) {
        results.push({
          id: t.id,
          type: "technician",
          title: `${t.firstName} ${t.lastName}`,
          subtitle: `${t.speciality ?? "Technicien"}${t.email ? ` · ${t.email}` : ""}`,
          url: `/fleet/technicians/${t.id}`,
        });
      }
    }

    for (const a of this.settled(articles)) {
      if (this.matches(normalizedQuery, a.name, a.reference, a.description)) {
        results.push({
          id: a.id,
          type: "article",
          title: `${a.name} (${a.reference})`,
          subtitle: `Stock : ${a.stockQuantity} ${a.unit}`,
          url: `/settings/stock/articles`,
        });
      }
    }

    for (const u of this.settled(users)) {
      if (this.matches(normalizedQuery, u.name, u.email)) {
        results.push({
          id: u.id,
          type: "user",
          title: u.name ?? u.email,
          subtitle: `${u.email} · ${u.role === "admin" ? "Administrateur" : "Membre"}`,
          url: `/users/${u.id}`,
        });
      }
    }

    const counts: Record<string, number> = {};
    for (const r of results) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
    }

    return { query, results, counts };
  }

  private matches(query: string, ...fields: (string | undefined | null)[]): boolean {
    return fields.some((f) => f && f.toLowerCase().includes(query));
  }

  private settled<T>(result: PromiseSettledResult<T[]>): T[] {
    return result.status === "fulfilled" ? result.value : [];
  }

  private caseStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: "Brouillon",
      open: "Ouvert",
      in_progress: "En cours",
      waiting: "En attente",
      completed: "Terminé",
      cancelled: "Annulé",
    };
    return map[status] ?? status;
  }

  private casePriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      urgent: "Urgente",
    };
    return map[priority] ?? priority;
  }

  private interventionStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planned: "Planifiée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    return map[status] ?? status;
  }

  private vehicleStatusLabel(status: string): string {
    const map: Record<string, string> = {
      actif: "Actif",
      maintenance: "Maintenance",
      hors_service: "Hors service",
    };
    return map[status] ?? status;
  }

  private fetchCases(user: AuthUser): Promise<CaseSummaryResponse[]> {
    return this.scopedHttp.request<CaseSummaryResponse[]>({
      baseUrl: CASES_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/cases",
      errorLabel: "Cases service error",
    });
  }

  private fetchInterventions(user: AuthUser): Promise<InterventionResponse[]> {
    return this.scopedHttp.request<InterventionResponse[]>({
      baseUrl: CASES_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/interventions",
      errorLabel: "Cases service error",
    });
  }

  private fetchVehicles(user: AuthUser): Promise<VehicleResponse[]> {
    return this.scopedHttp.request<VehicleResponse[]>({
      baseUrl: FLEET_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/vehicles",
      errorLabel: "Fleet service error",
    });
  }

  private fetchTechnicians(user: AuthUser): Promise<TechnicianResponse[]> {
    return this.scopedHttp.request<TechnicianResponse[]>({
      baseUrl: TECHNICIANS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/technicians",
      errorLabel: "Technicians service error",
    });
  }

  private fetchArticles(user: AuthUser): Promise<ArticleResponse[]> {
    return this.scopedHttp.request<ArticleResponse[]>({
      baseUrl: STOCK_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/articles",
      errorLabel: "Stock service error",
    });
  }

  private fetchUsers(user: AuthUser): Promise<UserResponse[]> {
    return this.scopedHttp.request<UserResponse[]>({
      baseUrl: USERS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/users",
      errorLabel: "Users service error",
    });
  }
}
