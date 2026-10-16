import type {
  CreatePrestationBody,
  PrestationResponse,
  PrestationsListResponse,
  UpdatePrestationBody,
} from "@planwise/shared";

export abstract class AbstractPrestationService {
  abstract createPrestation(body: CreatePrestationBody): Promise<PrestationResponse>;
  abstract listPrestations(
    organizationId: string,
    filters?: {
      search?: string;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PrestationsListResponse>;
  abstract getPrestation(id: string, organizationId: string): Promise<PrestationResponse>;
  abstract updatePrestation(id: string, body: UpdatePrestationBody): Promise<PrestationResponse>;
  abstract deletePrestation(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract purgeTestData(organizationId: string): Promise<void>;
}
