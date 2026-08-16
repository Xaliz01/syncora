import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import { firstValueFrom } from "rxjs";
import type { BillingStatus, CaseInvoiceSyncStatus, CaseResponse } from "@planwise/shared";
import { aggregateCaseBillingStatus, shouldUpgradeBillingStatus } from "@planwise/shared";
import { AbstractIntegrationsService } from "./ports/integrations.service.port";
import { CronRunRecorder } from "./cron-run.recorder";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

const JOB_KEY = "integrations.invoice-sync";

@Injectable()
export class InvoiceSyncScheduler {
  private readonly logger = new Logger(InvoiceSyncScheduler.name);
  private running = false;

  constructor(
    private readonly integrationsService: AbstractIntegrationsService,
    private readonly httpService: HttpService,
    private readonly cronRunRecorder: CronRunRecorder,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshPendingInvoiceSyncs(): Promise<void> {
    if (this.running) {
      await this.cronRunRecorder.start(JOB_KEY).then((id) =>
        this.cronRunRecorder.finish(id, {
          status: "skipped",
          stats: { skipped: 1 },
          errorMessage: "Run précédent encore en cours",
        }),
      );
      return;
    }
    this.running = true;
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    try {
      const result = await this.integrationsService.refreshPendingInvoiceSyncs();
      const byCase = new Map<string, CaseInvoiceSyncStatus[]>();
      for (const sync of result.updated) {
        const key = `${sync.organizationId}:${sync.caseId}`;
        const list = byCase.get(key) ?? [];
        list.push(sync);
        byCase.set(key, list);
      }

      let billingUpdates = 0;
      let caseMissingSkipped = 0;
      for (const [key, partial] of byCase) {
        const [organizationId, caseId] = key.split(":");
        if (!organizationId || !caseId) continue;
        const full = await this.integrationsService.getCaseInvoiceSync(organizationId, caseId);
        const outcome = await this.applyAggregatedBillingStatus(
          organizationId,
          caseId,
          full.invoices.length ? full.invoices : partial,
        );
        if (outcome === "updated") billingUpdates += 1;
        if (outcome === "case_missing") caseMissingSkipped += 1;
      }

      if (
        result.refreshed > 0 ||
        result.errors.length > 0 ||
        result.skipped > 0 ||
        caseMissingSkipped > 0
      ) {
        this.logger.log(
          `Invoice sync cron: refreshed=${result.refreshed} succeeded=${result.updated.length} skipped=${result.skipped} billingUpdates=${billingUpdates} caseMissingSkipped=${caseMissingSkipped} errors=${result.errors.length}`,
        );
      }
      for (const err of result.errors.slice(0, 5)) {
        this.logger.warn(
          `Invoice sync failed org=${err.organizationId} case=${err.caseId} sync=${err.syncId ?? "?"}: ${err.message}`,
        );
      }

      await this.cronRunRecorder.finish(runId, {
        status: result.errors.length > 0 && result.updated.length === 0 ? "error" : "ok",
        stats: {
          processed: result.refreshed,
          succeeded: result.updated.length,
          failed: result.errors.length,
          skipped: result.skipped + caseMissingSkipped,
          billingUpdates,
          caseMissingSkipped,
        },
        errorMessage:
          result.errors.length > 0
            ? `${result.errors.length} sync(s) en erreur (ex. ${result.errors[0]?.message})`
            : undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Invoice sync cron failed: ${message}`);
      await this.cronRunRecorder.finish(runId, { status: "error", errorMessage: message });
    } finally {
      this.running = false;
    }
  }

  private async applyAggregatedBillingStatus(
    organizationId: string,
    caseId: string,
    invoices: CaseInvoiceSyncStatus[],
  ): Promise<"updated" | "case_missing" | "noop"> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<CaseResponse>(`${SERVICE_URLS.cases}/cases/${caseId}`, {
          params: { organizationId },
          timeout: 15000,
        }),
      );

      const next = aggregateCaseBillingStatus(invoices, 0);
      if (!next) return "noop";

      const current = res.data.billingStatus;
      const mayApply =
        shouldUpgradeBillingStatus(current, next) ||
        current === "to_invoice" ||
        (current === "invoice_draft" && next === "partially_invoiced");
      if (!mayApply || current === next) return "noop";

      await firstValueFrom(
        this.httpService.patch(
          `${SERVICE_URLS.cases}/cases/${caseId}`,
          { organizationId, billingStatus: next as BillingStatus },
          { timeout: 15000 },
        ),
      );
      return "updated";
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 404) {
        // Conserve la trace facture ; marque pour ne plus retraiter (évite les 404 en boucle).
        const marked = await this.integrationsService.markInvoiceSyncsCaseMissing(
          organizationId,
          caseId,
        );
        this.logger.warn(
          `Dossier ${caseId} introuvable — skip billing (${marked} sync(s) marquée(s), conservées)`,
        );
        return "case_missing";
      }
      this.logger.warn(
        `Billing status update failed case=${caseId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return "noop";
    }
  }
}
