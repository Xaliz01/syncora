import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { CronJob } from "cron";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";
import { CronRunRecorder } from "./cron-run.recorder";

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008";
const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";
const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

/** Purge quotidienne des données de démo (4h) — via `cron`, sans @nestjs/schedule. */
const CLEANUP_CRON = "0 4 * * *";
const JOB_KEY = "organizations.trial-test-data-cleanup";

@Injectable()
export class TrialTestDataCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrialTestDataCleanupScheduler.name);
  private job?: CronJob;

  constructor(
    private readonly httpService: HttpService,
    private readonly organizationsService: AbstractOrganizationsService,
    private readonly cronRunRecorder: CronRunRecorder,
  ) {}

  onModuleInit(): void {
    this.job = CronJob.from({
      cronTime: CLEANUP_CRON,
      onTick: () => {
        void this.purgeExpiredTrialTestData();
      },
      start: true,
      timeZone: "Europe/Paris",
    });
    this.logger.log(`Trial test data cleanup scheduled (${CLEANUP_CRON}, Europe/Paris)`);
  }

  onModuleDestroy(): void {
    void this.job?.stop();
  }

  async purgeExpiredTrialTestData(): Promise<void> {
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const organizationIds =
        await this.organizationsService.listOrganizationsWithReadyTrialTestData();
      processed = organizationIds.length;

      if (organizationIds.length === 0) {
        await this.cronRunRecorder.finish(runId, {
          status: "ok",
          stats: { processed: 0, succeeded: 0, skipped: 0 },
        });
        return;
      }

      for (const organizationId of organizationIds) {
        try {
          const shouldPurge = await this.isTrialEnded(organizationId);
          if (!shouldPurge) {
            skipped += 1;
            continue;
          }
          await this.purgeAllServices(organizationId);
          await this.organizationsService.updateTrialTestData(organizationId, {
            status: "none",
            injectedAt: null,
            errorMessage: null,
          });
          succeeded += 1;
          this.logger.log(`Purged trial test data for organization ${organizationId}`);
        } catch (err: unknown) {
          failed += 1;
          this.logger.error(`Failed to purge trial test data for ${organizationId}`, err);
        }
      }

      await this.cronRunRecorder.finish(runId, {
        status: failed > 0 && succeeded === 0 ? "error" : "ok",
        stats: { processed, succeeded, skipped, failed },
        errorMessage: failed > 0 ? `${failed} organisation(s) en échec de purge` : undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.cronRunRecorder.finish(runId, {
        status: "error",
        stats: { processed, succeeded, skipped, failed },
        errorMessage: message,
      });
    }
  }

  private async isTrialEnded(organizationId: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ status: string; trialEndsAt: string | null }>(
          `${SUBSCRIPTIONS_URL}/subscriptions/current`,
          { params: { organizationId } },
        ),
      );
      const { status, trialEndsAt } = res.data;
      if (status !== "trialing") return true;
      if (!trialEndsAt) return false;
      return new Date(trialEndsAt).getTime() <= Date.now();
    } catch {
      return false;
    }
  }

  private async purgeAllServices(organizationId: string): Promise<void> {
    const query = { organizationId };
    const urls = [CASES_URL, STOCK_URL, FLEET_URL, TECHNICIANS_URL, CUSTOMERS_URL, PERMISSIONS_URL];
    for (const url of urls) {
      try {
        await firstValueFrom(this.httpService.delete(`${url}/test-data`, { params: query }));
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) continue;
        throw err;
      }
    }
  }
}
