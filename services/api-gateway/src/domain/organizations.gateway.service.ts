import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  OrganizationMembershipResponse,
  OrganizationResponse,
  SiretLookupResponse,
  SiretLookupResult,
  UpdateOrganizationBody,
  UserOrganizationsListResponse,
} from "@planwise/shared";
import { AbstractOrganizationsGatewayService } from "./ports/organizations.service.port";
import { AbstractOrganizationsService } from "./organizations/ports/organizations.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class OrganizationsGatewayService extends AbstractOrganizationsGatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly organizationsService: AbstractOrganizationsService,
  ) {
    super();
  }

  async listMine(user: AuthUser): Promise<UserOrganizationsListResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<OrganizationMembershipResponse[]>(
          `${SERVICE_URLS.users}/users/${user.id}/organization-memberships`,
        ),
      );
      const ids = [...new Set(res.data.map((m) => m.organizationId))];
      if (ids.length === 0 && user.organizationId) {
        const org = await this.organizationsService.findById(user.organizationId);
        return { organizations: org ? [org] : [] };
      }
      const orgs = await Promise.all(ids.map((id) => this.organizationsService.findById(id)));
      return {
        organizations: orgs.filter((o): o is OrganizationResponse => o !== null),
      };
    } catch {
      const org = await this.organizationsService.findById(user.organizationId);
      return { organizations: org ? [org] : [] };
    }
  }

  async getMine(user: AuthUser): Promise<OrganizationResponse | null> {
    return this.organizationsService.findById(user.organizationId);
  }

  async updateMine(
    user: AuthUser,
    body: UpdateOrganizationBody,
  ): Promise<OrganizationResponse | null> {
    return this.organizationsService.update(user.organizationId, body);
  }

  async lookupSiret(query: string): Promise<SiretLookupResponse> {
    const q = query.trim();
    if (!q) return { results: [] };
    try {
      const res = await firstValueFrom(
        this.httpService.get<RechercheEntreprisesResponse>(
          `https://recherche-entreprises.api.gouv.fr/search`,
          { params: { q, per_page: 5, page: 1 }, timeout: 8000 },
        ),
      );
      const results: SiretLookupResult[] = (res.data.results ?? []).map(
        (r: RechercheEntreprisesResult) => {
          const siege = r.siege ?? {};
          const streetParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie]
            .filter(Boolean)
            .join(" ");
          return {
            siret: siege.siret ?? "",
            siren: r.siren ?? "",
            nom: r.nom_complet ?? r.nom_raison_sociale ?? "",
            addressLine1: streetParts || undefined,
            addressLine2: siege.complement_adresse || undefined,
            postalCode: siege.code_postal || undefined,
            city: siege.libelle_commune || undefined,
            country: "FR",
          };
        },
      );
      return { results };
    } catch {
      return { results: [] };
    }
  }
}

interface RechercheEntreprisesSiege {
  siret?: string;
  numero_voie?: string;
  type_voie?: string;
  libelle_voie?: string;
  complement_adresse?: string;
  code_postal?: string;
  libelle_commune?: string;
}

interface RechercheEntreprisesResult {
  siren?: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: RechercheEntreprisesSiege;
}

interface RechercheEntreprisesResponse {
  results?: RechercheEntreprisesResult[];
}
