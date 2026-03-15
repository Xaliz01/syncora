import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CaseSummaryResponse,
  InterventionResponse,
  VehicleResponse,
  TechnicianResponse,
  ArticleResponse,
  UserResponse
} from "@syncora/shared";
import {
  AbstractSearchService,
  type GlobalSearchResponse,
  type SearchResultItem
} from "./ports/search.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class SearchGatewayService extends AbstractSearchService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async search(user: AuthUser, query: string): Promise<GlobalSearchResponse> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { query, results: [], counts: {} };
    }

    const [cases, interventions, vehicles, technicians, articles, users] =
      await Promise.allSettled([
        this.fetchCases(user),
        this.fetchInterventions(user),
        this.fetchVehicles(user),
        this.fetchTechnicians(user),
        this.fetchArticles(user),
        user.role === "admin" ? this.fetchUsers(user) : Promise.resolve([])
      ]);

    const results: SearchResultItem[] = [];

    for (const c of this.settled(cases)) {
      if (this.matches(normalizedQuery, c.title, c.assigneeName, c.status, ...(c.tags ?? []))) {
        results.push({
          id: c.id,
          type: "case",
          title: c.title,
          subtitle: `${this.caseStatusLabel(c.status)} · ${this.casePriorityLabel(c.priority)}${c.assigneeName ? ` · ${c.assigneeName}` : ""}`,
          url: `/cases/${c.id}`
        });
      }
    }

    for (const i of this.settled(interventions)) {
      if (this.matches(normalizedQuery, i.title, i.description, i.assigneeName, i.caseTitle, i.status)) {
        results.push({
          id: i.id,
          type: "intervention",
          title: i.title,
          subtitle: `${this.interventionStatusLabel(i.status)}${i.caseTitle ? ` · Dossier : ${i.caseTitle}` : ""}${i.assigneeName ? ` · ${i.assigneeName}` : ""}`,
          url: `/cases/${i.caseId}`
        });
      }
    }

    for (const v of this.settled(vehicles)) {
      if (this.matches(normalizedQuery, v.registrationNumber, v.brand, v.model, v.type, v.vin, v.color)) {
        results.push({
          id: v.id,
          type: "vehicle",
          title: `${v.brand ?? ""} ${v.model ?? ""} – ${v.registrationNumber}`.trim(),
          subtitle: `${v.type} · ${this.vehicleStatusLabel(v.status)}`,
          url: `/fleet/vehicles/${v.id}`
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
          url: `/fleet/technicians/${t.id}`
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
          url: `/settings/stock/articles`
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
          url: `/users/${u.id}`
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
      cancelled: "Annulé"
    };
    return map[status] ?? status;
  }

  private casePriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      low: "Basse",
      medium: "Moyenne",
      high: "Haute",
      urgent: "Urgente"
    };
    return map[priority] ?? priority;
  }

  private interventionStatusLabel(status: string): string {
    const map: Record<string, string> = {
      planned: "Planifiée",
      in_progress: "En cours",
      completed: "Terminée",
      cancelled: "Annulée"
    };
    return map[status] ?? status;
  }

  private vehicleStatusLabel(status: string): string {
    const map: Record<string, string> = {
      actif: "Actif",
      maintenance: "Maintenance",
      hors_service: "Hors service"
    };
    return map[status] ?? status;
  }

  private async fetchCases(user: AuthUser): Promise<CaseSummaryResponse[]> {
    return this.callService<CaseSummaryResponse[]>(
      CASES_URL,
      "/cases",
      { organizationId: user.organizationId }
    );
  }

  private async fetchInterventions(user: AuthUser): Promise<InterventionResponse[]> {
    return this.callService<InterventionResponse[]>(
      CASES_URL,
      "/interventions",
      { organizationId: user.organizationId }
    );
  }

  private async fetchVehicles(user: AuthUser): Promise<VehicleResponse[]> {
    return this.callService<VehicleResponse[]>(
      FLEET_URL,
      "/vehicles",
      { organizationId: user.organizationId }
    );
  }

  private async fetchTechnicians(user: AuthUser): Promise<TechnicianResponse[]> {
    return this.callService<TechnicianResponse[]>(
      TECHNICIANS_URL,
      "/technicians",
      { organizationId: user.organizationId }
    );
  }

  private async fetchArticles(user: AuthUser): Promise<ArticleResponse[]> {
    return this.callService<ArticleResponse[]>(
      STOCK_URL,
      "/articles",
      { organizationId: user.organizationId }
    );
  }

  private async fetchUsers(user: AuthUser): Promise<UserResponse[]> {
    return this.callService<UserResponse[]>(
      USERS_URL,
      "/users",
      { organizationId: user.organizationId }
    );
  }

  private async callService<T>(baseUrl: string, path: string, query: Record<string, string>): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.request<T>({
        method: "get",
        url: `${baseUrl}${path}`,
        params: query
      })
    );
    return response.data;
  }
}
