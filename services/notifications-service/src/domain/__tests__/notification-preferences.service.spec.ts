import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotificationPreferencesService } from "../notification-preferences.service";
import { AbstractNotificationPreferencesService } from "../ports/notification-preferences.service.port";
import { buildDefaultNotificationPreferences } from "@planwise/shared";

describe("NotificationPreferencesService", () => {
  let service: NotificationPreferencesService;
  let mockPreferencesModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const mockPreferencesDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "pref-123" },
    userId: "user-1",
    organizationId: "org-1",
    preferences: buildDefaultNotificationPreferences(),
    get: jest.fn((key: string) => {
      if (key === "createdAt") return new Date("2025-01-01");
      if (key === "updatedAt") return new Date("2025-01-02");
      return undefined;
    }),
    ...overrides,
  });

  beforeEach(async () => {
    mockPreferencesModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AbstractNotificationPreferencesService,
          useClass: NotificationPreferencesService,
        },
        {
          provide: getModelToken("NotificationPreferences"),
          useValue: mockPreferencesModel,
        },
      ],
    }).compile();

    service = module.get<AbstractNotificationPreferencesService>(
      AbstractNotificationPreferencesService,
    ) as NotificationPreferencesService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPreferences", () => {
    it("should return existing preferences when found", async () => {
      const doc = mockPreferencesDoc();
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getPreferences("user-1", "org-1");

      expect(result.id).toBe("pref-123");
      expect(result.userId).toBe("user-1");
      expect(result.organizationId).toBe("org-1");
      expect(result.preferences).toBeDefined();
      expect(result.preferences.reminderLeadTime).toBe(30);
    });

    it("should return default preferences when not found", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getPreferences("user-1", "org-1");

      expect(result.id).toBe("");
      expect(result.userId).toBe("user-1");
      expect(result.preferences.reminderLeadTime).toBe(30);
      expect(result.preferences.events.intervention_reminder.channels.in_app.enabled).toBe(true);
      expect(result.preferences.events.intervention_reminder.channels.push.enabled).toBe(true);
    });
  });

  describe("updatePreferences", () => {
    it("should upsert preferences", async () => {
      const prefs = buildDefaultNotificationPreferences();
      prefs.reminderLeadTime = 60;

      const doc = mockPreferencesDoc({ preferences: prefs });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.updatePreferences("user-1", "org-1", prefs);

      expect(mockPreferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-1", organizationId: "org-1" },
        { $set: { preferences: prefs } },
        { new: true, upsert: true },
      );
      expect(result.preferences).toEqual(prefs);
    });
  });
});
