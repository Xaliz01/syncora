import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { InterventionReminderScheduler } from "../intervention-reminder.scheduler";
import { AbstractPushSubscriptionService } from "../ports/push-subscription.service.port";
import { AbstractEmailService } from "../ports/email.service.port";
import { CronRunRecorder } from "../cron-run.recorder";
import { AbstractInterventionsService } from "../../cases/ports/interventions.service.port";
import { AbstractTechniciansService } from "../../technicians/ports/technicians.service.port";
import { AbstractUsersService } from "../../users/ports/users.service.port";
import { SubscriptionsService } from "../../subscriptions/subscriptions.service";

describe("InterventionReminderScheduler", () => {
  let scheduler: InterventionReminderScheduler;
  let mockPreferencesModel: { find: jest.Mock };
  let mockNotificationModel: { create: jest.Mock };
  let mockSentReminderModel: { findOne: jest.Mock; updateOne: jest.Mock };
  let mockInterventions: { listUpcomingInterventions: jest.Mock };
  let mockTechnicians: { getTechnician: jest.Mock; findByUserId: jest.Mock };
  let mockUsers: { findById: jest.Mock };
  let mockSubscriptions: { getByOrganization: jest.Mock };
  let mockPushService: { sendPushToUser: jest.Mock };
  let mockEmailService: {
    sendNotificationEmail: jest.Mock;
    sendTransactionalEmail: jest.Mock;
    isConfigured: jest.Mock;
  };
  let mockCronRunRecorder: { start: jest.Mock; finish: jest.Mock };

  const futureDate = (minutesFromNow: number) =>
    new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();

  beforeEach(async () => {
    mockPreferencesModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    mockNotificationModel = { create: jest.fn().mockResolvedValue({}) };
    mockSentReminderModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    mockInterventions = { listUpcomingInterventions: jest.fn().mockResolvedValue([]) };
    mockTechnicians = {
      getTechnician: jest.fn().mockRejectedValue(new Error("not a technician id")),
      findByUserId: jest.fn().mockResolvedValue({ id: "tech-1", userId: "user-1" }),
    };
    mockUsers = {
      findById: jest.fn().mockResolvedValue({ id: "user-1", email: "tech@example.com" }),
    };
    mockSubscriptions = { getByOrganization: jest.fn().mockResolvedValue({ hasAccess: true }) };
    mockPushService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    mockEmailService = {
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
      sendTransactionalEmail: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
    };
    mockCronRunRecorder = {
      start: jest.fn().mockResolvedValue("run-1"),
      finish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterventionReminderScheduler,
        {
          provide: getModelToken("NotificationPreferences", "notifications"),
          useValue: mockPreferencesModel,
        },
        {
          provide: getModelToken("Notification", "notifications"),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken("SentReminder", "notifications"),
          useValue: mockSentReminderModel,
        },
        { provide: AbstractPushSubscriptionService, useValue: mockPushService },
        { provide: AbstractEmailService, useValue: mockEmailService },
        { provide: AbstractInterventionsService, useValue: mockInterventions },
        { provide: AbstractTechniciansService, useValue: mockTechnicians },
        { provide: AbstractUsersService, useValue: mockUsers },
        { provide: SubscriptionsService, useValue: mockSubscriptions },
        { provide: CronRunRecorder, useValue: mockCronRunRecorder },
      ],
    }).compile();

    scheduler = module.get(InterventionReminderScheduler);
  });

  it("should be defined", () => {
    expect(scheduler).toBeDefined();
  });

  it("should send reminder for upcoming intervention within lead time", async () => {
    const intervention = {
      id: "int-1",
      organizationId: "org-1",
      caseId: "case-1",
      title: "Réparation chaudière",
      status: "planned",
      assigneeId: "user-1",
      scheduledStart: futureDate(20),
    };

    mockInterventions.listUpcomingInterventions.mockResolvedValue([intervention]);
    mockSubscriptions.getByOrganization.mockResolvedValue({ hasAccess: true });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        organizationId: "org-1",
        entityType: "intervention",
        entityId: "int-1",
      }),
    );
  });

  it("should not send reminder when organization has no active subscription", async () => {
    const intervention = {
      id: "int-expired",
      organizationId: "org-expired",
      caseId: "case-expired",
      title: "Intervention expirée",
      status: "planned",
      assigneeId: "user-expired",
      scheduledStart: futureDate(20),
    };

    mockInterventions.listUpcomingInterventions.mockResolvedValue([intervention]);
    mockSubscriptions.getByOrganization.mockResolvedValue({ hasAccess: false });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it("should gracefully handle upstream fetch failure", async () => {
    mockInterventions.listUpcomingInterventions.mockRejectedValue(new Error("Network error"));

    await expect(scheduler.checkUpcomingInterventions()).resolves.toBeUndefined();
  });
});
