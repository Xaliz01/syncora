import { Injectable, Logger } from "@nestjs/common";
import { CronRunRecorder } from "./cron-run.recorder";

const JOB_KEY = "integrations.invoice-sync";

@Injectable()
export class InvoiceSyncScheduler {
  private readonly logger = new Logger(InvoiceSyncScheduler.name);

  constructor(private readonly cronRunRecorder: CronRunRecorder) {}

  /** Ancien cron toutes les 10 min — plus enregistré, pas d’appel distant. */
  async refreshPendingInvoiceSyncs(): Promise<void> {
    this.logger.log(
      "Invoice sync cron disabled — local Planwise invoicing is the source of truth.",
    );
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    await this.cronRunRecorder.finish(runId, {
      status: "skipped",
      stats: { skipped: 1 },
      errorMessage: "Job désactivé : les factures clients sont émises dans Planwise.",
    });
  }
}
