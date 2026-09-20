import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AiQuotaService } from "../../domain/ai-quota.service";
import { isValidAiUsageKey, type AiQuotaTier, type AiUsageKey } from "@planwise/shared";

function ensureOrg(organizationId: string): string {
  if (!organizationId?.trim()) throw new BadRequestException("organizationId is required");
  return organizationId.trim();
}

function ensureUsage(usage: string): AiUsageKey {
  if (!isValidAiUsageKey(usage)) throw new BadRequestException(`Invalid AI usage key: ${usage}`);
  return usage;
}

function ensureTier(tier: string): AiQuotaTier {
  if (tier !== "trial" && tier !== "essential" && tier !== "copilot") {
    throw new BadRequestException(`Invalid quota tier: ${tier}`);
  }
  return tier;
}

function ensurePeriod(period: string): string {
  if (!period?.trim()) throw new BadRequestException("period is required");
  return period.trim();
}

@Controller("ai-quota")
export class AiQuotaController {
  constructor(private readonly aiQuotaService: AiQuotaService) {}

  @Get("status")
  async getStatus(
    @Query("organizationId") organizationId: string,
    @Query("usage") usage: string,
    @Query("tier") tier: string,
    @Query("period") period: string,
  ) {
    return this.aiQuotaService.getQuotaStatus(
      ensureOrg(organizationId),
      ensureUsage(usage),
      ensureTier(tier),
      ensurePeriod(period),
    );
  }

  @Post("increment")
  async increment(
    @Body()
    body: {
      organizationId: string;
      usage: string;
      tier: string;
      period: string;
    },
  ) {
    return this.aiQuotaService.incrementIfAllowed(
      ensureOrg(body.organizationId),
      ensureUsage(body.usage),
      ensureTier(body.tier),
      ensurePeriod(body.period),
    );
  }
}
