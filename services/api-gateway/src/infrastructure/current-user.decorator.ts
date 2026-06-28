import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "@planwise/shared";
import type { AuthUser } from "@planwise/shared";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const p = request.user;
    return {
      id: p.sub,
      email: p.email,
      organizationId: p.organizationId,
      role: p.role,
      status: p.status,
      permissions: p.permissions,
      name: p.name,
      technicianId: p.technicianId,
    };
  },
);
