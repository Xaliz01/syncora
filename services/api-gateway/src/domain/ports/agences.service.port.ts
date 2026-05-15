import type { AuthUser, AgenceResponse, UpdateAgenceBody } from "@syncora/shared";

export abstract class AbstractAgencesGatewayService {
  abstract createAgence(
    currentUser: AuthUser,
    body: {
      name: string;
      address?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    },
  ): Promise<AgenceResponse>;
  abstract listAgences(currentUser: AuthUser): Promise<AgenceResponse[]>;
  abstract getAgence(currentUser: AuthUser, agenceId: string): Promise<AgenceResponse>;
  abstract updateAgence(
    currentUser: AuthUser,
    agenceId: string,
    body: UpdateAgenceBody,
  ): Promise<AgenceResponse>;
  abstract deleteAgence(currentUser: AuthUser, agenceId: string): Promise<{ deleted: true }>;
}
