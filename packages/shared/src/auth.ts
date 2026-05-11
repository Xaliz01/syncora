/** Contrat API auth (register / login) */

import type { PermissionCode } from "./permissions";
import type { UserStatus } from "./user";

export interface RegisterBody {
  organizationName: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  permissions: PermissionCode[];
  name?: string;
}

export type UserRole = "admin" | "member";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  status: UserStatus;
  permissions: PermissionCode[];
  email: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SwitchOrganizationBody {
  organizationId: string;
}
