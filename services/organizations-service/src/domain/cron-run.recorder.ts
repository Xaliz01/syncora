import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { CronRunResponse, CronRunStats, CronRunsListResponse } from "@planwise/shared";
import type { CronRunDocument } from "../persistence/cron-run.schema";

@Injectable()
export class CronRunRecorder {
  private readonly serviceName = "organizations-service";

  constructor(@InjectModel("CronRun") private readonly cronRunModel: Model<CronRunDocument>) {}

  async start(jobKey: string): Promise<string> {
    const doc = await this.cronRunModel.create({
      jobKey,
      service: this.serviceName,
      status: "running",
      startedAt: new Date(),
    });
    return doc._id.toString();
  }

  async finish(
    runId: string,
    outcome: {
      status: "ok" | "error" | "skipped";
      stats?: CronRunStats;
      errorMessage?: string;
    },
  ): Promise<void> {
    const finishedAt = new Date();
    const doc = await this.cronRunModel.findById(runId).exec();
    if (!doc) return;
    doc.status = outcome.status;
    doc.finishedAt = finishedAt;
    doc.durationMs = Math.max(0, finishedAt.getTime() - doc.startedAt.getTime());
    if (outcome.stats) doc.stats = outcome.stats;
    if (outcome.errorMessage) doc.errorMessage = outcome.errorMessage.slice(0, 2000);
    await doc.save();
  }

  async list(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse> {
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const query: Record<string, unknown> = {};
    if (filters?.jobKey?.trim()) query.jobKey = filters.jobKey.trim();

    const [total, docs] = await Promise.all([
      this.cronRunModel.countDocuments(query).exec(),
      this.cronRunModel.find(query).sort({ startedAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    return {
      total,
      runs: docs.map((doc) => this.toResponse(doc)),
    };
  }

  async getLatest(jobKey: string): Promise<CronRunResponse | null> {
    const doc = await this.cronRunModel.findOne({ jobKey }).sort({ startedAt: -1 }).exec();
    return doc ? this.toResponse(doc) : null;
  }

  private toResponse(doc: CronRunDocument): CronRunResponse {
    return {
      id: doc._id.toString(),
      jobKey: doc.jobKey,
      service: doc.service,
      status: doc.status,
      startedAt: doc.startedAt.toISOString(),
      finishedAt: doc.finishedAt?.toISOString(),
      durationMs: doc.durationMs,
      stats: doc.stats as CronRunStats | undefined,
      errorMessage: doc.errorMessage,
    };
  }
}
