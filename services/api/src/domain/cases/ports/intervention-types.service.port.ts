import type {
  CreateInterventionTypeBody,
  InterventionTypeResponse,
  InterventionTypesListResponse,
  UpdateInterventionTypeBody,
} from "@planwise/shared";

export abstract class AbstractInterventionTypesService {
  abstract create(body: CreateInterventionTypeBody): Promise<InterventionTypeResponse>;
  abstract list(organizationId: string): Promise<InterventionTypesListResponse>;
  abstract getById(id: string, organizationId: string): Promise<InterventionTypeResponse>;
  abstract update(id: string, body: UpdateInterventionTypeBody): Promise<InterventionTypeResponse>;
  abstract remove(id: string, organizationId: string): Promise<{ deleted: true }>;
}
