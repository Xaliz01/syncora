import type { PushSubscriptionResponse } from "@planwise/shared";

export abstract class AbstractPushSubscriptionService {
  abstract register(
    userId: string,
    organizationId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ): Promise<PushSubscriptionResponse>;

  abstract unregister(userId: string, endpoint: string): Promise<{ deleted: boolean }>;

  abstract listForUser(userId: string, organizationId: string): Promise<PushSubscriptionResponse[]>;

  abstract sendPushToUser(
    userId: string,
    organizationId: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<{ sent: number; failed: number }>;
}
