import { BadRequestException, Body, Controller, Delete, Get, Post, Query } from "@nestjs/common";
import { AbstractPushSubscriptionService } from "../../domain/ports/push-subscription.service.port";
import type { RegisterPushSubscriptionBody } from "@planwise/shared";

@Controller()
export class PushSubscriptionsController {
  constructor(private readonly pushService: AbstractPushSubscriptionService) {}

  @Post("push-subscriptions")
  async register(@Query("userId") userId: string, @Body() body: RegisterPushSubscriptionBody) {
    if (!userId || !body.organizationId || !body.endpoint || !body.keys) {
      throw new BadRequestException("userId, organizationId, endpoint and keys are required");
    }
    return this.pushService.register(
      userId,
      body.organizationId,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
    );
  }

  @Delete("push-subscriptions")
  async unregister(@Query("userId") userId: string, @Query("endpoint") endpoint: string) {
    if (!userId || !endpoint) {
      throw new BadRequestException("userId and endpoint are required");
    }
    return this.pushService.unregister(userId, endpoint);
  }

  @Get("push-subscriptions")
  async listForUser(
    @Query("userId") userId: string,
    @Query("organizationId") organizationId: string,
  ) {
    if (!userId || !organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.pushService.listForUser(userId, organizationId);
  }

  @Get("vapid-public-key")
  getVapidPublicKey() {
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
    return { publicKey };
  }

  @Post("push-subscriptions/send")
  async sendPush(
    @Body()
    body: {
      userId: string;
      organizationId: string;
      title: string;
      body: string;
      url?: string;
    },
  ) {
    if (!body.userId || !body.organizationId || !body.title) {
      throw new BadRequestException("userId, organizationId, and title are required");
    }
    return this.pushService.sendPushToUser(body.userId, body.organizationId, {
      title: body.title,
      body: body.body,
      url: body.url,
    });
  }
}
