import { Injectable } from "@nestjs/common";
import type {
  AgenceResponse,
  AuthUser,
  CreateAgenceBody,
  UpdateAgenceBody,
} from "@planwise/shared";
import { AbstractAgencesGatewayService } from "./ports/agences.service.port";
import { AbstractAgencesService } from "./technicians/ports/agences.service.port";

@Injectable()
export class AgencesGatewayService extends AbstractAgencesGatewayService {
  constructor(private readonly agencesService: AbstractAgencesService) {
    super();
  }

  async createAgence(
    currentUser: AuthUser,
    body: {
      name: string;
      address?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    },
  ): Promise<AgenceResponse> {
    return this.agencesService.createAgence({
      ...body,
      organizationId: currentUser.organizationId,
    } as CreateAgenceBody);
  }

  async listAgences(currentUser: AuthUser): Promise<AgenceResponse[]> {
    return this.agencesService.listAgences(currentUser.organizationId);
  }

  async getAgence(currentUser: AuthUser, agenceId: string): Promise<AgenceResponse> {
    return this.agencesService.getAgence(currentUser.organizationId, agenceId);
  }

  async updateAgence(
    currentUser: AuthUser,
    agenceId: string,
    body: UpdateAgenceBody,
  ): Promise<AgenceResponse> {
    return this.agencesService.updateAgence(currentUser.organizationId, agenceId, body);
  }

  async deleteAgence(currentUser: AuthUser, agenceId: string): Promise<{ deleted: true }> {
    return this.agencesService.deleteAgence(currentUser.organizationId, agenceId);
  }
}
