import type { HealthPayload } from "@planwise/shared";

export abstract class AbstractAppService {
  abstract getHealth(): HealthPayload;
}
