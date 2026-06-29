import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as webpush from "web-push";
import type { PushSubscriptionResponse } from "@planwise/shared";
import type { PushSubscriptionDocument } from "../persistence/push-subscription.schema";
import { AbstractPushSubscriptionService } from "./ports/push-subscription.service.port";

@Injectable()
export class PushSubscriptionService extends AbstractPushSubscriptionService {
  private readonly logger = new Logger(PushSubscriptionService.name);
  private readonly vapidConfigured: boolean;

  constructor(
    @InjectModel("PushSubscription")
    private readonly subscriptionModel: Model<PushSubscriptionDocument>,
  ) {
    super();
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? "mailto:contact@planwise.fr";

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    } else {
      this.logger.warn("VAPID keys not configured — push notifications disabled");
      this.vapidConfigured = false;
    }
  }

  async register(
    userId: string,
    organizationId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ): Promise<PushSubscriptionResponse> {
    const doc = await this.subscriptionModel
      .findOneAndUpdate(
        { endpoint },
        { $set: { userId, organizationId, p256dh, auth } },
        { new: true, upsert: true },
      )
      .exec();
    return this.toResponse(doc!);
  }

  async unregister(userId: string, endpoint: string): Promise<{ deleted: boolean }> {
    const result = await this.subscriptionModel.deleteOne({ userId, endpoint }).exec();
    return { deleted: result.deletedCount > 0 };
  }

  async listForUser(userId: string, organizationId: string): Promise<PushSubscriptionResponse[]> {
    const docs = await this.subscriptionModel.find({ userId, organizationId }).exec();
    return docs.map((d) => this.toResponse(d));
  }

  async sendPushToUser(
    userId: string,
    organizationId: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<{ sent: number; failed: number }> {
    if (!this.vapidConfigured) {
      this.logger.debug("Push skipped (VAPID not configured)");
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await this.subscriptionModel.find({ userId, organizationId }).exec();

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-72x72.png",
          }),
          { TTL: 3600 },
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          staleEndpoints.push(sub.endpoint);
        }
        failed++;
        this.logger.warn(`Push failed for endpoint ${sub.endpoint}`, (err as Error).message);
      }
    }

    if (staleEndpoints.length > 0) {
      await this.subscriptionModel.deleteMany({ endpoint: { $in: staleEndpoints } }).exec();
      this.logger.log(`Cleaned ${staleEndpoints.length} stale push subscriptions`);
    }

    return { sent, failed };
  }

  private toResponse(doc: PushSubscriptionDocument): PushSubscriptionResponse {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      organizationId: doc.organizationId,
      endpoint: doc.endpoint,
      createdAt: doc.get("createdAt")?.toISOString(),
    };
  }
}
