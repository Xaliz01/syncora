import type { AiQuotaTier, AiUsageKey } from "@planwise/shared";

export interface AiQuotaTick {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export abstract class AbstractAiQuotaService {
  abstract getStatus(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<AiQuotaTick>;

  abstract incrementIfAllowed(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<AiQuotaTick>;

  abstract release(organizationId: string, usage: AiUsageKey, period: string): Promise<void>;
}
