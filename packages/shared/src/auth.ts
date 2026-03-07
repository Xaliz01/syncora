/** Contrat API auth (register / login) */

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
  name?: string;
}

export type UserRole = "admin" | "member";

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: UserRole;
  email: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
