import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getAiQuotaLimit, type AiQuotaTier, type AiUsageKey } from "@planwise/shared";
import { isDuplicateKeyError } from "./cases/utils";
import type { AiQuotaCounterDocument } from "../persistence/organizations/ai-quota-counter.schema";
import { AbstractAiQuotaService, type AiQuotaTick } from "./ports/ai-quota.service.port";

@Injectable()
export class AiQuotaService extends AbstractAiQuotaService {
  constructor(
    @InjectModel("AiQuotaCounter", "organizations")
    private readonly counters: Model<AiQuotaCounterDocument>,
  ) {
    super();
  }

  async getStatus(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<AiQuotaTick> {
    const limit = getAiQuotaLimit(usage, tier);
    const doc = await this.counters.findOne({ organizationId, usage, period }).exec();
    const used = doc?.count ?? 0;
    return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) };
  }

  async incrementIfAllowed(
    organizationId: string,
    usage: AiUsageKey,
    tier: AiQuotaTier,
    period: string,
  ): Promise<AiQuotaTick> {
    const limit = getAiQuotaLimit(usage, tier);
    if (limit <= 0) {
      const used = await this.readCount(organizationId, usage, period);
      return { allowed: false, used, limit, remaining: 0 };
    }

    try {
      const doc = await this.counters
        .findOneAndUpdate(
          { organizationId, usage, period, count: { $lt: limit } },
          {
            $inc: { count: 1 },
            $setOnInsert: { organizationId, usage, period },
          },
          { new: true, upsert: true },
        )
        .exec();
      if (!doc) {
        const used = await this.readCount(organizationId, usage, period);
        return { allowed: false, used, limit, remaining: 0 };
      }
      return {
        allowed: true,
        used: doc.count,
        limit,
        remaining: Math.max(0, limit - doc.count),
      };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
      const used = await this.readCount(organizationId, usage, period);
      return { allowed: false, used, limit, remaining: 0 };
    }
  }

  async release(organizationId: string, usage: AiUsageKey, period: string): Promise<void> {
    await this.counters
      .updateOne({ organizationId, usage, period, count: { $gt: 0 } }, { $inc: { count: -1 } })
      .exec();
  }

  private async readCount(
    organizationId: string,
    usage: AiUsageKey,
    period: string,
  ): Promise<number> {
    const doc = await this.counters.findOne({ organizationId, usage, period }).exec();
    return doc?.count ?? 0;
  }
}
