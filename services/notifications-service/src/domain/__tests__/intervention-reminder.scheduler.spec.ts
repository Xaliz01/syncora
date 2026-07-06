import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { InterventionReminderScheduler } from "../intervention-reminder.scheduler";
import { AbstractPushSubscriptionService } from "../ports/push-subscription.service.port";
import { AbstractEmailService } from "../ports/email.service.port";

describe("InterventionReminderScheduler", () => {
  let scheduler: InterventionReminderScheduler;
  let mockPreferencesModel: { find: jest.Mock };
  let mockNotificationModel: { create: jest.Mock };
  let mockSentReminderModel: { findOne: jest.Mock; updateOne: jest.Mock };
  let mockHttpService: { get: jest.Mock };
  let mockPushService: { sendPushToUser: jest.Mock };
  let mockEmailService: { sendNotificationEmail: jest.Mock };

  const futureDate = (minutesFromNow: number) =>
    new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();

  beforeEach(async () => {
    mockPreferencesModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    mockNotificationModel = { create: jest.fn().mockResolvedValue({}) };
    mockSentReminderModel = {
      findOne: jest
        .fn()
        .mockReturnValue({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    mockHttpService = { get: jest.fn() };
    mockPushService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    mockEmailService = { sendNotificationEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterventionReminderScheduler,
        { provide: getModelToken("NotificationPreferences"), useValue: mockPreferencesModel },
        { provide: getModelToken("Notification"), useValue: mockNotificationModel },
        { provide: getModelToken("SentReminder"), useValue: mockSentReminderModel },
        { provide: AbstractPushSubscriptionService, useValue: mockPushService },
        { provide: AbstractEmailService, useValue: mockEmailService },
        { provide: HttpService, useValue: mockHttpService },
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

    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("/upcoming")) {
        return of({ data: [intervention] });
      }
      return of({ data: { email: "tech@example.com" } });
    });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        organizationId: "org-1",
        entityType: "intervention",
        entityId: "int-1",
      }),
    );
    expect(mockSentReminderModel.updateOne).toHaveBeenCalledWith(
      { interventionId: "int-1", userId: "user-1", leadTime: 30 },
      expect.any(Object),
      { upsert: true },
    );
  });

  it("should skip already-sent reminders (persistent dedup)", async () => {
    const intervention = {
      id: "int-2",
      organizationId: "org-1",
      caseId: "case-2",
      title: "Inspection",
      status: "planned",
      assigneeId: "user-2",
      scheduledStart: futureDate(15),
    };

    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("/upcoming")) {
        return of({ data: [intervention] });
      }
      return of({ data: { email: "tech@example.com" } });
    });

    mockSentReminderModel.findOne.mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ interventionId: "int-2", userId: "user-2", leadTime: 30 }),
      }),
    });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
    expect(mockSentReminderModel.updateOne).not.toHaveBeenCalled();
  });

  it("should not send reminder for intervention outside lead time window", async () => {
    const intervention = {
      id: "int-3",
      organizationId: "org-1",
      caseId: "case-3",
      title: "Future work",
      status: "planned",
      assigneeId: "user-3",
      scheduledStart: futureDate(120),
    };

    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("/upcoming")) {
        return of({ data: [intervention] });
      }
      return of({ data: {} });
    });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it("should skip interventions without assigneeId", async () => {
    const intervention = {
      id: "int-4",
      organizationId: "org-1",
      caseId: "case-4",
      title: "Unassigned",
      status: "planned",
      scheduledStart: futureDate(10),
    };

    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("/upcoming")) {
        return of({ data: [intervention] });
      }
      return of({ data: {} });
    });

    await scheduler.checkUpcomingInterventions();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it("should gracefully handle upstream fetch failure", async () => {
    mockHttpService.get.mockImplementation(() => {
      throw new Error("Network error");
    });

    await expect(scheduler.checkUpcomingInterventions()).resolves.toBeUndefined();
  });
});
