import type {
  CreateOrganizationBody,
  OrganizationResponse,
  TrialTestDataStatusResponse,
  UpdateOrganizationBody,
  UpdateOrganizationTrialTestDataBody,
} from "@planwise/shared";

export abstract class AbstractOrganizationsService {
  abstract create(body: CreateOrganizationBody): Promise<OrganizationResponse>;
  abstract findById(id: string): Promise<OrganizationResponse | null>;
  abstract update(id: string, body: UpdateOrganizationBody): Promise<OrganizationResponse | null>;
  abstract getTrialTestDataStatus(organizationId: string): Promise<TrialTestDataStatusResponse>;
  abstract updateTrialTestData(
    organizationId: string,
    body: UpdateOrganizationTrialTestDataBody,
  ): Promise<TrialTestDataStatusResponse>;
  abstract listOrganizationsWithReadyTrialTestData(): Promise<string[]>;
}
