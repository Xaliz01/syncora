import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { JwtPayload } from "@syncora/shared";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user) throw new ForbiddenException("User context is missing");
    if (user.role !== "admin") {
      throw new ForbiddenException("Admin role required");
    }
    return true;
  }
}
