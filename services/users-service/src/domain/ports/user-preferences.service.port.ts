import type { UpdateUserPreferencesBody, UserPreferencesResponse } from "@planwise/shared";

export abstract class AbstractUserPreferencesService {
  abstract getPreferences(
    userId: string,
    organizationId?: string,
  ): Promise<UserPreferencesResponse>;
  abstract updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse>;
}
