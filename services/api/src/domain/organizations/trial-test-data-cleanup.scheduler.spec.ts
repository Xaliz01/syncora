import { TrialTestDataCleanupScheduler } from "./trial-test-data-cleanup.scheduler";
import type { AbstractOrganizationsService } from "./ports/organizations.service.port";
import type { CronRunRecorder } from "./cron-run.recorder";
import type { TrialTestDataService } from "../trial-test-data.service";
import type { SubscriptionsService } from "../subscriptions/subscriptions.service";

describe("TrialTestDataCleanupScheduler", () => {
  const organizations = {
    listOrganizationsWithReadyTrialTestData: jest.fn(),
  };
  const cronRunRecorder = {
    start: jest.fn().mockResolvedValue("run-1"),
    finish: jest.fn().mockResolvedValue(undefined),
  };
  const trialTestData = { purgeOrganization: jest.fn().mockResolvedValue({ purged: true }) };
  const subscriptions = { getByOrganization: jest.fn() };

  const scheduler = new TrialTestDataCleanupScheduler(
    organizations as unknown as AbstractOrganizationsService,
    cronRunRecorder as unknown as CronRunRecorder,
    trialTestData as unknown as TrialTestDataService,
    subscriptions as unknown as SubscriptionsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    cronRunRecorder.start.mockResolvedValue("run-1");
    trialTestData.purgeOrganization.mockResolvedValue({ purged: true });
  });

  it("skips organizations still in trial", async () => {
    organizations.listOrganizationsWithReadyTrialTestData.mockResolvedValue(["org-1"]);
    subscriptions.getByOrganization.mockResolvedValue({
      status: "trialing",
      trialEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    await scheduler.purgeExpiredTrialTestData();

    expect(trialTestData.purgeOrganization).not.toHaveBeenCalled();
    expect(cronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "ok",
        stats: expect.objectContaining({ skipped: 1, succeeded: 0 }),
      }),
    );
  });

  it("purges organizations whose trial has ended", async () => {
    organizations.listOrganizationsWithReadyTrialTestData.mockResolvedValue(["org-1"]);
    subscriptions.getByOrganization.mockResolvedValue({
      status: "trialing",
      trialEndsAt: new Date(Date.now() - 86_400_000).toISOString(),
    });

    await scheduler.purgeExpiredTrialTestData();

    expect(trialTestData.purgeOrganization).toHaveBeenCalledWith("org-1");
    expect(cronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "ok",
        stats: expect.objectContaining({ succeeded: 1, skipped: 0 }),
      }),
    );
  });
});
