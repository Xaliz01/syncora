import type {
  CreateAgenceBody,
  UpdateAgenceBody,
  AgenceResponse
} from "@syncora/shared";

export abstract class AbstractAgencesService {
  abstract createAgence(body: CreateAgenceBody): Promise<AgenceResponse>;
  abstract updateAgence(
    organizationId: string,
    agenceId: string,
    body: UpdateAgenceBody
  ): Promise<AgenceResponse>;
  abstract getAgence(
    organizationId: string,
    agenceId: string
  ): Promise<AgenceResponse>;
  abstract listAgences(organizationId: string): Promise<AgenceResponse[]>;
  abstract deleteAgence(
    organizationId: string,
    agenceId: string
  ): Promise<{ deleted: true }>;
}
