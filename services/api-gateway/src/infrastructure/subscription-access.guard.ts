import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser, JwtPayload } from "@syncora/shared";
import { AbstractSubscriptionsGatewayService } from "../domain/ports/subscriptions.service.port";
import { SKIP_SUBSCRIPTION_CHECK_KEY } from "./skip-subscription-check.metadata";

@Injectable()
export class SubscriptionAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const jwt = request.user;
    if (!jwt) return true;

    const user: AuthUser = {
      id: jwt.sub,
      email: jwt.email,
      organizationId: jwt.organizationId,
      role: jwt.role,
      status: jwt.status,
      permissions: jwt.permissions ?? [],
      name: jwt.name
    };

    const sub = await this.subscriptionsGateway.getCurrentSubscription(user);
    if (!sub.hasAccess) {
      throw new ForbiddenException(
        "Abonnement inactif ou expiré. Ouvrez Mon organisation pour activer un essai ou vous réabonner."
      );
    }
    return true;
  }
}
