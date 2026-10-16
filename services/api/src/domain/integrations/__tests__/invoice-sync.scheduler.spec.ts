import { Test, TestingModule } from "@nestjs/testing";
import { InvoiceSyncScheduler } from "../invoice-sync.scheduler";
import { CronRunRecorder } from "../cron-run.recorder";

describe("InvoiceSyncScheduler", () => {
  let scheduler: InvoiceSyncScheduler;
  let cronRunRecorder: { start: jest.Mock; finish: jest.Mock };

  beforeEach(async () => {
    cronRunRecorder = {
      start: jest.fn().mockResolvedValue("run-1"),
      finish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceSyncScheduler, { provide: CronRunRecorder, useValue: cronRunRecorder }],
    }).compile();

    scheduler = module.get(InvoiceSyncScheduler);
  });

  it("does not refresh remote invoices when invoked", async () => {
    await scheduler.refreshPendingInvoiceSyncs();

    expect(cronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "skipped",
        stats: expect.objectContaining({ skipped: 1 }),
      }),
    );
  });
});
