import type {
  OrganizationResponse,
  TrialTestDataStatusResponse,
  UpdateOrganizationBody,
  UpdateOrganizationTrialTestDataBody,
} from "@syncora/shared";

export abstract class AbstractOrganizationsService {
  abstract create(name: string, siret?: string): Promise<OrganizationResponse>;
  abstract findById(id: string): Promise<OrganizationResponse | null>;
  abstract update(id: string, body: UpdateOrganizationBody): Promise<OrganizationResponse | null>;
  abstract getTrialTestDataStatus(organizationId: string): Promise<TrialTestDataStatusResponse>;
  abstract updateTrialTestData(
    organizationId: string,
    body: UpdateOrganizationTrialTestDataBody,
  ): Promise<TrialTestDataStatusResponse>;
  abstract listOrganizationsWithReadyTrialTestData(): Promise<string[]>;
}
