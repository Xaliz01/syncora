import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { AiQuotaCounterDocument } from "../persistence/ai-quota-counter.schema";
import type { AiUsageKey, AiQuotaTier } from "@planwise/shared";
import { getAiQuotaLimit } from "@planwise/shared";

@Injectable()
export class AiQuotaService {
  constructor(
    @InjectModel("AiQuotaCounter")
    private readonly counterModel: Model<AiQuotaCounterDocument>,
  ) {}

  /**
   * Get current usage count for an org + usage + period.
   * Returns 0 if no counter exists yet.
   */
  async getUsage(organizationId: string, usage: AiUsageKey, period: string): Promise<number> {
    const doc = await this.counterModel.findOne({ organizationId, usage, period }).exec();
    return doc?.count ?? 0;
  }

  /**
   * Atomically check remaining quota and increment if within limits.
   * Returns { allowed, used, limit, remaining }.
   */
  async incrementIfAllowed(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const limit = getAiQuotaLimit(usage, tier);

    const doc = await this.counterModel
      .findOneAndUpdate(
        {
          organizationId,
          usage,
          period,
          count: { $lt: limit },
        },
        { $inc: { count: 1 } },
        { new: true, upsert: true },
      )
      .exec();

    if (doc) {
      return {
        allowed: true,
        used: doc.count,
        limit,
        remaining: Math.max(0, limit - doc.count),
      };
    }

    const existing = await this.counterModel.findOne({ organizationId, usage, period }).exec();
    const used = existing?.count ?? 0;
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
    };
  }

  /**
   * Get quota status without incrementing.
   */
  async getQuotaStatus(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<{
    used: number;
    limit: number;
    remaining: number;
  }> {
    const limit = getAiQuotaLimit(usage, tier);
    const used = await this.getUsage(organizationId, usage, period);
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }
}
