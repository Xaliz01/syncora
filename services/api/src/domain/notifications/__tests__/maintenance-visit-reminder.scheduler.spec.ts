import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { MaintenanceVisitReminderScheduler } from "../maintenance-visit-reminder.scheduler";
import { AbstractPushSubscriptionService } from "../ports/push-subscription.service.port";
import { AbstractEmailService } from "../ports/email.service.port";
import { CronRunRecorder } from "../cron-run.recorder";
import { MaintenanceContractsService } from "../../cases/maintenance-contracts.service";
import { AbstractUsersService } from "../../users/ports/users.service.port";
import { SubscriptionsService } from "../../subscriptions/subscriptions.service";

describe("MaintenanceVisitReminderScheduler", () => {
  let scheduler: MaintenanceVisitReminderScheduler;
  let mockPreferencesModel: { find: jest.Mock };
  let mockNotificationModel: { create: jest.Mock };
  let mockContracts: { listReminderCandidates: jest.Mock; markReminded: jest.Mock };
  let mockUsers: { listByOrganization: jest.Mock; findById: jest.Mock };
  let mockSubscriptions: { getByOrganization: jest.Mock };
  let mockPushService: { sendPushToUser: jest.Mock };
  let mockEmailService: { sendNotificationEmail: jest.Mock };
  let mockCronRunRecorder: { start: jest.Mock; finish: jest.Mock };

  beforeEach(async () => {
    mockPreferencesModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    mockNotificationModel = { create: jest.fn().mockResolvedValue({}) };
    mockContracts = {
      listReminderCandidates: jest.fn().mockResolvedValue([]),
      markReminded: jest.fn().mockResolvedValue({}),
    };
    mockUsers = {
      listByOrganization: jest.fn().mockResolvedValue([{ id: "user-1", email: "a@b.c" }]),
      findById: jest.fn().mockResolvedValue({ id: "user-1", email: "a@b.c" }),
    };
    mockSubscriptions = { getByOrganization: jest.fn().mockResolvedValue({ hasAccess: true }) };
    mockPushService = { sendPushToUser: jest.fn().mockResolvedValue(undefined) };
    mockEmailService = { sendNotificationEmail: jest.fn().mockResolvedValue(undefined) };
    mockCronRunRecorder = {
      start: jest.fn().mockResolvedValue("run-1"),
      finish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceVisitReminderScheduler,
        {
          provide: getModelToken("NotificationPreferences", "notifications"),
          useValue: mockPreferencesModel,
        },
        {
          provide: getModelToken("Notification", "notifications"),
          useValue: mockNotificationModel,
        },
        { provide: MaintenanceContractsService, useValue: mockContracts },
        { provide: AbstractUsersService, useValue: mockUsers },
        { provide: SubscriptionsService, useValue: mockSubscriptions },
        { provide: AbstractPushSubscriptionService, useValue: mockPushService },
        { provide: AbstractEmailService, useValue: mockEmailService },
        { provide: CronRunRecorder, useValue: mockCronRunRecorder },
      ],
    }).compile();

    scheduler = module.get(MaintenanceVisitReminderScheduler);
  });

  it("envoie un rappel et marque le contrat", async () => {
    mockContracts.listReminderCandidates.mockResolvedValue([
      {
        id: "c1",
        organizationId: "org-1",
        title: "Entretien",
        nextDueDate: "2026-03-15",
      },
    ]);
    mockSubscriptions.getByOrganization.mockResolvedValue({ hasAccess: true });

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
    expect(mockContracts.markReminded).toHaveBeenCalledWith("org-1", "c1");
    expect(mockCronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({ status: "ok", stats: expect.objectContaining({ succeeded: 1 }) }),
    );
  });

  it("ignore les orgs sans abonnement actif", async () => {
    mockContracts.listReminderCandidates.mockResolvedValue([
      { id: "c1", organizationId: "org-1", title: "X", nextDueDate: "2026-03-15" },
    ]);
    mockSubscriptions.getByOrganization.mockResolvedValue({ hasAccess: false });

    await scheduler.checkMaintenanceVisitReminders();

    expect(mockNotificationModel.create).not.toHaveBeenCalled();
    expect(mockContracts.markReminded).not.toHaveBeenCalled();
  });
});
