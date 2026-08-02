import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { MaintenanceVisitReminderScheduler } from "../maintenance-visit-reminder.scheduler";
import { AbstractPushSubscriptionService } from "../ports/push-subscription.service.port";
import { AbstractEmailService } from "../ports/email.service.port";
import { CronRunRecorder } from "../cron-run.recorder";

describe("MaintenanceVisitReminderScheduler", () => {
  let scheduler: MaintenanceVisitReminderScheduler;
  let mockPreferencesModel: { find: jest.Mock };
  let mockNotificationModel: { create: jest.Mock };
  let mockHttpService: { get: jest.Mock; post: jest.Mock };
  let mockPushService: { sendPushToUser: jest.Mock };
  let mockEmailService: { sendNotificationEmail: jest.Mock };
  let mockCronRunRecorder: { start: jest.Mock; finish: jest.Mock };

  beforeEach(async () => {
    mockPreferencesModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    mockNotificationModel = { create: jest.fn().mockResolvedValue({}) };
    mockHttpService = { get: jest.fn(), post: jest.fn().mockReturnValue(of({ data: {} })) };
    mockPushService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    mockEmailService = { sendNotificationEmail: jest.fn().mockResolvedValue(undefined) };
    mockCronRunRecorder = {
      start: jest.fn().mockResolvedValue("run-1"),
      finish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceVisitReminderScheduler,
        { provide: getModelToken("NotificationPreferences"), useValue: mockPreferencesModel },
        { provide: getModelToken("Notification"), useValue: mockNotificationModel },
        { provide: HttpService, useValue: mockHttpService },
        { provide: AbstractPushSubscriptionService, useValue: mockPushService },
        { provide: AbstractEmailService, useValue: mockEmailService },
        { provide: CronRunRecorder, useValue: mockCronRunRecorder },
      ],
    }).compile();

    scheduler = module.get(MaintenanceVisitReminderScheduler);
  });

  it("envoie un rappel et marque le contrat", async () => {
    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("reminder-candidates")) {
        return of({
          data: [
            {
              id: "c1",
              organizationId: "org-1",
              title: "Entretien",
              nextDueDate: "2026-03-15",
            },
          ],
        });
      }
      if (url.includes("/subscriptions/current")) {
        return of({ data: { hasAccess: true } });
      }
      if (url.endsWith("/users") || url.includes("/users?")) {
        return of({ data: [{ id: "user-1", email: "a@b.c" }] });
      }
      if (url.includes("/users/user-1")) {
        return of({ data: { id: "user-1", email: "a@b.c" } });
      }
      return of({ data: [] });
    });

    await scheduler.checkMaintenanceVisitReminders();

    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        entityType: "maintenance_contract",
        entityId: "c1",
        detail: expect.stringContaining("à programmer"),
      }),
    );
    expect(mockHttpService.post).toHaveBeenCalledWith(
      expect.stringContaining("/mark-reminded"),
      {},
      expect.objectContaining({ params: { organizationId: "org-1" } }),
    );
    expect(mockCronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "ok", stats: expect.objectContaining({ succeeded: 1 }) }),
    );
  });

  it("ignore les orgs sans abonnement actif", async () => {
    mockHttpService.get.mockImplementation((url: string) => {
      if (url.includes("reminder-candidates")) {
        return of({
          data: [{ id: "c1", organizationId: "org-1", title: "X", nextDueDate: "2026-03-15" }],
        });
      }
      if (url.includes("/subscriptions/current")) {
        return of({ data: { hasAccess: false } });
      }
      return of({ data: [] });
    });

    await scheduler.checkMaintenanceVisitReminders();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
    expect(mockHttpService.post).not.toHaveBeenCalled();
  });
});
