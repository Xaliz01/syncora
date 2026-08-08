import type { PushSubscriptionResponse } from "@planwise/shared";
import type { PushSubscriptionDocument } from "../../persistence/push-subscription.schema";

export function toPushSubscriptionResponse(
  doc: PushSubscriptionDocument,
): PushSubscriptionResponse {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    organizationId: doc.organizationId,
    endpoint: doc.endpoint,
    createdAt: doc.get("createdAt")?.toISOString(),
  };
}
