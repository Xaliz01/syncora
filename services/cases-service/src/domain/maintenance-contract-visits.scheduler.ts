import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CronRunRecorder } from "./cron-run.recorder";
import { MaintenanceContractsService } from "./maintenance-contracts.service";

const JOB_KEY = "cases.maintenance-contract-visits";

@Injectable()
export class MaintenanceContractVisitsScheduler {
  private readonly logger = new Logger(MaintenanceContractVisitsScheduler.name);
  private running = false;

  constructor(
    private readonly contractsService: MaintenanceContractsService,
    private readonly cronRunRecorder: CronRunRecorder,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleDueVisits(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    try {
      const stats = await this.contractsService.processDueContracts();
      await this.cronRunRecorder.finish(runId, {
        status: stats.failed > 0 && stats.succeeded === 0 ? "error" : "ok",
        stats,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Cron ${JOB_KEY} failed: ${message}`);
      await this.cronRunRecorder.finish(runId, {
        status: "error",
        errorMessage: message,
      });
    } finally {
      this.running = false;
    }
  }
}
