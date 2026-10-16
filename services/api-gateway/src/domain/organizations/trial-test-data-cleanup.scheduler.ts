import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { CronJob } from "cron";
import { AbstractOrganizationsService } from "./ports/organizations.service.port";
import { CronRunRecorder } from "./cron-run.recorder";
import { TrialTestDataService } from "../trial-test-data.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

/** Purge quotidienne des données de démo (4h) — via `cron`, sans @nestjs/schedule. */
const CLEANUP_CRON = "0 4 * * *";
const JOB_KEY = "organizations.trial-test-data-cleanup";

@Injectable()
export class TrialTestDataCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrialTestDataCleanupScheduler.name);
  private job?: CronJob;

  constructor(
    private readonly organizationsService: AbstractOrganizationsService,
    private readonly cronRunRecorder: CronRunRecorder,
    private readonly trialTestData: TrialTestDataService,
    private readonly subscriptions: SubscriptionsService,
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
          await this.trialTestData.purgeOrganization(organizationId);
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
      const sub = await this.subscriptions.getByOrganization(organizationId);
      if (sub.status !== "trialing") return true;
      if (!sub.trialEndsAt) return false;
      return new Date(sub.trialEndsAt).getTime() <= Date.now();
    } catch {
      return false;
    }
  }
}
