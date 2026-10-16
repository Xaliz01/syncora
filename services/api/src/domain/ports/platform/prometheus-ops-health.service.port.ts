import type { PlatformOpsHealthResponse } from "@planwise/shared";

export abstract class AbstractPrometheusOpsHealthService {
  abstract getOpsHealth(): Promise<PlatformOpsHealthResponse>;
}
