import type {
  AuthUser,
  InjectTrialTestDataResponse,
  PurgeTrialTestDataResponse,
  TrialTestDataStatusResponse,
} from "@planwise/shared";

export abstract class AbstractTrialTestDataService {
  abstract getStatus(user: AuthUser): Promise<TrialTestDataStatusResponse>;
  abstract inject(user: AuthUser): Promise<InjectTrialTestDataResponse>;
  abstract purge(user: AuthUser): Promise<PurgeTrialTestDataResponse>;
  abstract purgeOrganization(organizationId: string): Promise<PurgeTrialTestDataResponse>;
}
