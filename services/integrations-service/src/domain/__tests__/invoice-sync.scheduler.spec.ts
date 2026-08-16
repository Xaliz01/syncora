import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { throwError } from "rxjs";
import { AxiosError, AxiosHeaders } from "axios";
import { InvoiceSyncScheduler } from "../invoice-sync.scheduler";
import { AbstractIntegrationsService } from "../ports/integrations.service.port";
import { CronRunRecorder } from "../cron-run.recorder";

describe("InvoiceSyncScheduler", () => {
  let scheduler: InvoiceSyncScheduler;
  let integrationsService: {
    refreshPendingInvoiceSyncs: jest.Mock;
    getCaseInvoiceSync: jest.Mock;
    markInvoiceSyncsCaseMissing: jest.Mock;
  };
  let httpService: { get: jest.Mock; patch: jest.Mock };
  let cronRunRecorder: { start: jest.Mock; finish: jest.Mock };

  beforeEach(async () => {
    integrationsService = {
      refreshPendingInvoiceSyncs: jest.fn(),
      getCaseInvoiceSync: jest.fn(),
      markInvoiceSyncsCaseMissing: jest.fn().mockResolvedValue(1),
    };
    httpService = {
      get: jest.fn(),
      patch: jest.fn(),
    };
    cronRunRecorder = {
      start: jest.fn().mockResolvedValue("run-1"),
      finish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceSyncScheduler,
        { provide: AbstractIntegrationsService, useValue: integrationsService },
        { provide: HttpService, useValue: httpService },
        { provide: CronRunRecorder, useValue: cronRunRecorder },
      ],
    }).compile();

    scheduler = module.get(InvoiceSyncScheduler);
  });

  it("marks syncs when the case returns 404 without deleting them", async () => {
    integrationsService.refreshPendingInvoiceSyncs.mockResolvedValue({
      refreshed: 1,
      skipped: 0,
      updated: [
        {
          id: "sync-1",
          organizationId: "org-1",
          caseId: "case-gone",
          provider: "qonto",
          remoteStatus: "finalized",
          draft: false,
        },
      ],
      errors: [],
    });
    integrationsService.getCaseInvoiceSync.mockResolvedValue({
      invoices: [
        {
          id: "sync-1",
          organizationId: "org-1",
          caseId: "case-gone",
          provider: "qonto",
          remoteStatus: "finalized",
          draft: false,
        },
      ],
    });
    const axiosErr = new AxiosError("Not Found");
    axiosErr.response = {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    };
    httpService.get.mockReturnValue(throwError(() => axiosErr));

    await scheduler.refreshPendingInvoiceSyncs();

    expect(integrationsService.markInvoiceSyncsCaseMissing).toHaveBeenCalledWith(
      "org-1",
      "case-gone",
    );
    expect(cronRunRecorder.finish).toHaveBeenCalledWith(
      "run-1",
      expect.objectContaining({
        status: "ok",
        stats: expect.objectContaining({ caseMissingSkipped: 1 }),
      }),
    );
  });
});
