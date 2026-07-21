import { Controller, Get, Query } from "@nestjs/common";
import { CronRunRecorder } from "../../domain/cron-run.recorder";

/** Endpoints backoffice (proxy gateway /platform). */
@Controller("platform")
export class PlatformOpsController {
  constructor(private readonly cronRunRecorder: CronRunRecorder) {}

  @Get("cron-runs")
  listCronRuns(
    @Query("jobKey") jobKey?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.cronRunRecorder.list({
      jobKey,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("cron-runs/latest")
  getLatestCronRun(@Query("jobKey") jobKey: string) {
    return this.cronRunRecorder.getLatest(jobKey);
  }
}
