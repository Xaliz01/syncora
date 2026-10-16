import type {
  NotificationPreferencesData,
  NotificationPreferencesResponse,
} from "@planwise/shared";

export abstract class AbstractNotificationPreferencesService {
  abstract getPreferences(
    userId: string,
    organizationId: string,
  ): Promise<NotificationPreferencesResponse>;

  abstract updatePreferences(
    userId: string,
    organizationId: string,
    preferences: NotificationPreferencesData,
  ): Promise<NotificationPreferencesResponse>;
}
