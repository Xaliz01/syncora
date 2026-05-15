import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtPayload, PermissionCode } from "@syncora/shared";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

/** Au moins une des permissions (utile pour lecture « dérivée », ex. agences pour affectation d’équipe). */
export const REQUIRED_ANY_PERMISSIONS_KEY = "requiredAnyPermissions";
export const RequireAnyPermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions);

@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user) throw new ForbiddenException("Contexte utilisateur manquant");

    if (user.role === "admin") return true;

    const userPermissions = new Set(user.permissions ?? []);

    const anyPermissions = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(
      REQUIRED_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (anyPermissions && anyPermissions.length > 0) {
      const hasAny = anyPermissions.some((p) => userPermissions.has(p));
      if (!hasAny) {
        throw new ForbiddenException("Permissions insuffisantes");
      }
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const hasAll = requiredPermissions.every((p) => userPermissions.has(p));
    if (!hasAll) {
      throw new ForbiddenException("Permissions insuffisantes");
    }
    return true;
  }
}
