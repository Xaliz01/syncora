import { Test, TestingModule } from "@nestjs/testing";
import { NotificationEventListener } from "../notification-event.listener";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractNotificationsService } from "../notifications/ports/notifications.service.port";
import { AbstractNotificationPreferencesService } from "../notifications/ports/notification-preferences.service.port";
import { AbstractPushSubscriptionService } from "../notifications/ports/push-subscription.service.port";
import { AbstractEmailService } from "../notifications/ports/email.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import type { PlanwiseDomainEvent } from "../../infrastructure/notify.interceptor";

describe("NotificationEventListener", () => {
  let listener: NotificationEventListener;
  let notifications: { createForOrganization: jest.Mock };
  let preferences: { getPreferences: jest.Mock };
  let push: { sendPushToUser: jest.Mock };
  let email: { sendTransactionalEmail: jest.Mock; sendNotificationEmail: jest.Mock };
  let users: { listByOrganization: jest.Mock; findById: jest.Mock };
  let mockSubscriptionsGateway: { getCurrentSubscription: jest.Mock };

  const baseEvent: PlanwiseDomainEvent = {
    organizationId: "org-1",
    actorId: "actor-1",
    actorName: "Alice",
    entityType: "case",
    entityId: "case-1",
    entityLabel: "Dossier test",
    action: "created",
  };

  const defaultPreferences = {
    preferences: {
      events: {},
      reminderLeadTime: 30,
    },
  };

  beforeEach(async () => {
    notifications = { createForOrganization: jest.fn().mockResolvedValue([]) };
    preferences = { getPreferences: jest.fn().mockResolvedValue(defaultPreferences) };
    push = { sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, failed: 0 }) };
    email = {
      sendTransactionalEmail: jest.fn().mockResolvedValue({ sent: true }),
      sendNotificationEmail: jest.fn().mockResolvedValue({ sent: true }),
    };
    users = {
      listByOrganization: jest.fn().mockResolvedValue([{ id: "user-2", email: "bob@example.com" }]),
      findById: jest.fn().mockResolvedValue({ id: "user-2", email: "bob@example.com" }),
    };
    mockSubscriptionsGateway = {
      getCurrentSubscription: jest.fn().mockResolvedValue({ hasAccess: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventListener,
        { provide: AbstractNotificationsService, useValue: notifications },
        { provide: AbstractNotificationPreferencesService, useValue: preferences },
        { provide: AbstractPushSubscriptionService, useValue: push },
        { provide: AbstractEmailService, useValue: email },
        { provide: AbstractUsersService, useValue: users },
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: mockSubscriptionsGateway,
        },
      ],
    }).compile();

    listener = module.get(NotificationEventListener);
  });

  it("should skip all notifications when organization has no active subscription", async () => {
    mockSubscriptionsGateway.getCurrentSubscription.mockResolvedValue({ hasAccess: false });

    await listener.handleEntityChanged(baseEvent);

    expect(mockSubscriptionsGateway.getCurrentSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1" }),
    );
    expect(notifications.createForOrganization).not.toHaveBeenCalled();
    expect(users.listByOrganization).not.toHaveBeenCalled();
  });

  it("should send notifications when organization has active subscription", async () => {
    await listener.handleEntityChanged(baseEvent);

    expect(mockSubscriptionsGateway.getCurrentSubscription).toHaveBeenCalled();
    expect(notifications.createForOrganization).toHaveBeenCalled();
  });

  it("should include organizationId on push and email deep links", async () => {
    preferences.getPreferences.mockResolvedValue({
      preferences: {
        events: {
          case_created: {
            channels: {
              in_app: { enabled: true },
              push: { enabled: true },
              email: { enabled: true },
              sms: { enabled: false },
            },
          },
        },
        reminderLeadTime: 30,
      },
    });

    await listener.handleEntityChanged(baseEvent);

    expect(push.sendPushToUser).toHaveBeenCalledWith(
      "user-2",
      "org-1",
      expect.objectContaining({
        url: "/cases/case-1?organizationId=org-1",
      }),
    );
    expect(email.sendNotificationEmail).toHaveBeenCalledWith(
      "bob@example.com",
      expect.any(String),
      expect.any(String),
      "/cases/case-1?organizationId=org-1",
    );
  });

  it("should deep-link intervention events to the related case with organizationId", async () => {
    preferences.getPreferences.mockResolvedValue({
      preferences: {
        events: {
          intervention_started: {
            channels: {
              in_app: { enabled: true },
              push: { enabled: true },
              email: { enabled: false },
              sms: { enabled: false },
            },
          },
        },
        reminderLeadTime: 30,
      },
    });

    await listener.handleEntityChanged({
      organizationId: "org-1",
      actorId: "actor-1",
      actorName: "Alice",
      entityType: "intervention",
      entityId: "int-1",
      entityLabel: "Plomberie",
      action: "updated",
      relatedEntityType: "case",
      relatedEntityId: "case-9",
      detail: "Intervention démarrée",
    });

    expect(push.sendPushToUser).toHaveBeenCalledWith(
      "user-2",
      "org-1",
      expect.objectContaining({
        url: "/cases/case-9?organizationId=org-1",
      }),
    );
  });

  describe("handleAccountRegistered", () => {
    const previousAlertEmail = process.env.PLATFORM_SIGNUP_ALERT_EMAIL;

    afterEach(() => {
      if (previousAlertEmail === undefined) {
        delete process.env.PLATFORM_SIGNUP_ALERT_EMAIL;
      } else {
        process.env.PLATFORM_SIGNUP_ALERT_EMAIL = previousAlertEmail;
      }
    });

    it("sends a transactional ops alert email asynchronously", async () => {
      delete process.env.PLATFORM_SIGNUP_ALERT_EMAIL;

      await listener.handleAccountRegistered({
        userId: "user-new",
        email: "new@example.com",
        name: "Alice",
      });

      expect(email.sendTransactionalEmail).toHaveBeenCalledWith(
        "mail@benoistbabin.fr",
        "Nouvel utilisateur inscrit",
        expect.stringContaining("new@example.com"),
        undefined,
        undefined,
        expect.any(String),
      );
    });

    it("skips when PLATFORM_SIGNUP_ALERT_EMAIL is blank", async () => {
      process.env.PLATFORM_SIGNUP_ALERT_EMAIL = " ";

      await listener.handleAccountRegistered({
        userId: "user-new",
        email: "new@example.com",
      });

      expect(email.sendTransactionalEmail).not.toHaveBeenCalled();
    });
  });

  describe("handleOrganizationCreated", () => {
    const previousAlertEmail = process.env.PLATFORM_SIGNUP_ALERT_EMAIL;

    afterEach(() => {
      if (previousAlertEmail === undefined) {
        delete process.env.PLATFORM_SIGNUP_ALERT_EMAIL;
      } else {
        process.env.PLATFORM_SIGNUP_ALERT_EMAIL = previousAlertEmail;
      }
    });

    it("sends a transactional ops alert email asynchronously", async () => {
      delete process.env.PLATFORM_SIGNUP_ALERT_EMAIL;

      await listener.handleOrganizationCreated({
        organizationId: "org-new",
        name: "Plomberie Dupont",
        siret: "12345678901234",
        email: "facturation@dupont.fr",
        createdByUserId: "user-1",
        createdByEmail: "admin@dupont.fr",
      });

      expect(email.sendTransactionalEmail).toHaveBeenCalledWith(
        "mail@benoistbabin.fr",
        "Nouvelle organisation créée",
        expect.stringContaining("Plomberie Dupont"),
        undefined,
        undefined,
        expect.any(String),
      );
    });
  });
});
