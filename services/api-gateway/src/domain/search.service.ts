import { Injectable } from "@nestjs/common";
import type {
  AuthUser,
  ArticlesListResponse,
  CaseSummaryResponse,
  CasesListResponse,
  InterventionResponse,
  InterventionsListResponse,
  VehicleResponse,
  TechnicianResponse,
  ArticleResponse,
  UserResponse,
  CustomerResponse,
  CustomersListResponse,
  OrderGiverResponse,
  OrderGiversListResponse,
  PrestationResponse,
  PrestationsListResponse,
  TeamResponse,
  AgenceResponse,
} from "@planwise/shared";
import { DEFAULT_PAGE_LIMIT } from "@planwise/shared";
import {
  AbstractSearchService,
  type GlobalSearchResponse,
  type SearchResultItem,
} from "./ports/search.service.port";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

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

    const [
      cases,
      interventions,
      customers,
      orderGivers,
      vehicles,
      technicians,
      teams,
      agences,
      articles,
      prestations,
      users,
    ] = await Promise.allSettled([
      this.fetchCases(user, normalizedQuery),
      this.fetchInterventions(user, normalizedQuery),
      this.fetchCustomers(user, normalizedQuery),
      this.fetchOrderGivers(user, normalizedQuery),
      this.fetchVehicles(user),
      this.fetchTechnicians(user),
      this.fetchTeams(user),
      this.fetchAgences(user),
      this.fetchArticles(user, normalizedQuery),
      this.fetchPrestations(user, normalizedQuery),
      user.role === "admin" ? this.fetchUsers(user) : Promise.resolve([]),
    ]);

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

    for (const customer of this.settled(customers)) {
      if (
        this.matches(
          normalizedQuery,
          customer.displayName,
          customer.companyName,
          customer.firstName,
          customer.lastName,
          customer.email,
          customer.phone,
          customer.mobile,
          customer.legalIdentifier,
        )
      ) {
        const kindLabel = customer.kind === "company" ? "Entreprise" : "Particulier";
        const detail = [customer.email, customer.legalIdentifier].filter(Boolean).join(" · ");
        results.push({
          id: customer.id,
          type: "customer",
          title: customer.displayName,
          subtitle: detail ? `${kindLabel} · ${detail}` : kindLabel,
          url: `/customers/${customer.id}`,
        });
      }
    }

    for (const orderGiver of this.settled(orderGivers)) {
      if (
        this.matches(
          normalizedQuery,
          orderGiver.displayName,
          orderGiver.companyName,
          orderGiver.firstName,
          orderGiver.lastName,
          orderGiver.email,
          orderGiver.phone,
          orderGiver.mobile,
          orderGiver.legalIdentifier,
        )
      ) {
        const kindLabel = orderGiver.kind === "company" ? "Entreprise" : "Particulier";
        const detail = [orderGiver.email, orderGiver.legalIdentifier].filter(Boolean).join(" · ");
        results.push({
          id: orderGiver.id,
          type: "order_giver",
          title: orderGiver.displayName,
          subtitle: detail
            ? `Donneur d'ordre · ${kindLabel} · ${detail}`
            : `Donneur d'ordre · ${kindLabel}`,
          url: `/order-givers/${orderGiver.id}`,
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

    for (const team of this.settled(teams)) {
      if (this.matches(normalizedQuery, team.name, team.agenceName)) {
        results.push({
          id: team.id,
          type: "team",
          title: team.name,
          subtitle: team.agenceName ? `Agence : ${team.agenceName}` : "Équipe",
          url: `/fleet/teams/${team.id}`,
        });
      }
    }

    for (const agence of this.settled(agences)) {
      if (
        this.matches(normalizedQuery, agence.name, agence.city, agence.postalCode, agence.address)
      ) {
        results.push({
          id: agence.id,
          type: "agence",
          title: agence.name,
          subtitle: [agence.postalCode, agence.city].filter(Boolean).join(" ") || "Agence",
          url: `/fleet/agences/${agence.id}`,
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
          url: `/settings/stock/articles/${a.id}`,
        });
      }
    }

    for (const p of this.settled(prestations)) {
      if (this.matches(normalizedQuery, p.name, p.reference, p.description)) {
        const priceLabel = Number.isFinite(p.defaultPrice)
          ? `${p.defaultPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`
          : undefined;
        const subtitle = [priceLabel, p.unit].filter(Boolean).join(" · ") || "Prestation";
        results.push({
          id: p.id,
          type: "prestation",
          title: `${p.name} (${p.reference})`,
          subtitle,
          url: `/settings/prestations?q=${encodeURIComponent(p.reference || p.name)}`,
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

  /** Chaque mot de la requête doit apparaître dans l’ensemble des champs (ex. « Jean Moulin »). */
  private matches(query: string, ...fields: (string | undefined | null)[]): boolean {
    const haystack = fields
      .filter((f): f is string => Boolean(f && String(f).trim()))
      .join(" ")
      .toLowerCase();
    if (!haystack) return false;
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    return tokens.every((token) => haystack.includes(token));
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

  private fetchCases(user: AuthUser, search: string): Promise<CaseSummaryResponse[]> {
    return this.scopedHttp
      .request<CasesListResponse>({
        baseUrl: SERVICE_URLS.cases,
        organizationId: user.organizationId,
        method: "get",
        path: "/cases",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Cases service error",
      })
      .then((response) => response.cases);
  }

  private fetchInterventions(user: AuthUser, search: string): Promise<InterventionResponse[]> {
    return this.scopedHttp
      .request<InterventionsListResponse>({
        baseUrl: SERVICE_URLS.cases,
        organizationId: user.organizationId,
        method: "get",
        path: "/interventions",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Cases service error",
      })
      .then((response) => response.interventions);
  }

  private fetchCustomers(user: AuthUser, search: string): Promise<CustomerResponse[]> {
    return this.scopedHttp
      .request<CustomersListResponse>({
        baseUrl: SERVICE_URLS.customers,
        organizationId: user.organizationId,
        method: "get",
        path: "/customers",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Customers service error",
      })
      .then((response) => response.customers);
  }

  private fetchOrderGivers(user: AuthUser, search: string): Promise<OrderGiverResponse[]> {
    return this.scopedHttp
      .request<OrderGiversListResponse>({
        baseUrl: SERVICE_URLS.customers,
        organizationId: user.organizationId,
        method: "get",
        path: "/order-givers",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Order givers service error",
      })
      .then((response) => response.orderGivers);
  }

  private fetchVehicles(user: AuthUser): Promise<VehicleResponse[]> {
    return this.scopedHttp.request<VehicleResponse[]>({
      baseUrl: SERVICE_URLS.fleet,
      organizationId: user.organizationId,
      method: "get",
      path: "/vehicles",
      errorLabel: "Fleet service error",
    });
  }

  private fetchTechnicians(user: AuthUser): Promise<TechnicianResponse[]> {
    return this.scopedHttp.request<TechnicianResponse[]>({
      baseUrl: SERVICE_URLS.technicians,
      organizationId: user.organizationId,
      method: "get",
      path: "/technicians",
      errorLabel: "Technicians service error",
    });
  }

  private fetchTeams(user: AuthUser): Promise<TeamResponse[]> {
    return this.scopedHttp.request<TeamResponse[]>({
      baseUrl: SERVICE_URLS.technicians,
      organizationId: user.organizationId,
      method: "get",
      path: "/teams",
      errorLabel: "Technicians service error",
    });
  }

  private fetchAgences(user: AuthUser): Promise<AgenceResponse[]> {
    return this.scopedHttp.request<AgenceResponse[]>({
      baseUrl: SERVICE_URLS.technicians,
      organizationId: user.organizationId,
      method: "get",
      path: "/agences",
      errorLabel: "Technicians service error",
    });
  }

  private fetchArticles(user: AuthUser, search: string): Promise<ArticleResponse[]> {
    return this.scopedHttp
      .request<ArticlesListResponse>({
        baseUrl: SERVICE_URLS.stock,
        organizationId: user.organizationId,
        method: "get",
        path: "/articles",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Stock service error",
      })
      .then((response) => response.articles);
  }

  private fetchPrestations(user: AuthUser, search: string): Promise<PrestationResponse[]> {
    return this.scopedHttp
      .request<PrestationsListResponse>({
        baseUrl: SERVICE_URLS.stock,
        organizationId: user.organizationId,
        method: "get",
        path: "/prestations",
        query: { search, limit: DEFAULT_PAGE_LIMIT, offset: 0 },
        errorLabel: "Stock service error",
      })
      .then((response) => response.prestations);
  }

  private fetchUsers(user: AuthUser): Promise<UserResponse[]> {
    return this.scopedHttp.request<UserResponse[]>({
      baseUrl: SERVICE_URLS.users,
      organizationId: user.organizationId,
      method: "get",
      path: "/users",
      errorLabel: "Users service error",
    });
  }
}
