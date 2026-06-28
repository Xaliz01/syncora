import type { HealthPayload } from "@syncora/shared";

export abstract class AbstractAppService {
  abstract getHealth(): HealthPayload;
}
