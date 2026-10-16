import type {
  InterventionPrestationUsageResponse,
  InterventionPrestationUsagesListResponse,
  SetInterventionPrestationUsagesBody,
} from "@planwise/shared";

export abstract class AbstractInterventionPrestationUsageService {
  abstract listByIntervention(
    organizationId: string,
    interventionId: string,
  ): Promise<InterventionPrestationUsagesListResponse>;

  abstract listByCase(
    organizationId: string,
    caseId: string,
  ): Promise<InterventionPrestationUsagesListResponse>;

  abstract replaceUsages(
    interventionId: string,
    body: SetInterventionPrestationUsagesBody,
  ): Promise<InterventionPrestationUsageResponse[]>;
}
