import {
  buildDefaultNotificationPreferences,
  mergeNotificationPreferencesWithDefaults,
  type NotificationPreferencesData,
} from "../notification";

describe("mergeNotificationPreferencesWithDefaults", () => {
  it("retourne les défauts si rien n’est stocké", () => {
    const merged = mergeNotificationPreferencesWithDefaults(undefined);
    expect(merged).toEqual(buildDefaultNotificationPreferences());
  });

  it("complète un eventType manquant (ex. maintenance_visit_reminder)", () => {
    const defaults = buildDefaultNotificationPreferences();
    const legacyEvents = { ...defaults.events };
    delete (legacyEvents as Partial<typeof legacyEvents>).maintenance_visit_reminder;
    const stored: NotificationPreferencesData = {
      reminderLeadTime: 60,
      events: legacyEvents as NotificationPreferencesData["events"],
    };

    const merged = mergeNotificationPreferencesWithDefaults(stored);

    expect(merged.reminderLeadTime).toBe(60);
    expect(merged.events.maintenance_visit_reminder).toEqual(
      defaults.events.maintenance_visit_reminder,
    );
    expect(merged.events.intervention_reminder.channels.in_app.enabled).toBe(
      defaults.events.intervention_reminder.channels.in_app.enabled,
    );
  });

  it("conserve les canaux déjà configurés", () => {
    const defaults = buildDefaultNotificationPreferences();
    const stored: NotificationPreferencesData = {
      ...defaults,
      events: {
        ...defaults.events,
        case_created: {
          channels: {
            in_app: { enabled: false },
            email: { enabled: true },
            push: { enabled: false },
            sms: { enabled: false },
          },
        },
      },
    };

    const merged = mergeNotificationPreferencesWithDefaults(stored);
    expect(merged.events.case_created.channels.in_app.enabled).toBe(false);
    expect(merged.events.case_created.channels.email.enabled).toBe(true);
  });
});
