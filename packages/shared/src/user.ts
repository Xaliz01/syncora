/** Contrat API users-service (création + validation credentials) */

import type { UserRole } from "./auth";

export interface CreateUserBody {
  organizationId: string;
  email: string;
  password: string;
  name?: string;
  role: UserRole;
}

export interface UserResponse {
  id: string;
  organizationId: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: string;
}

export interface ValidateCredentialsBody {
  email: string;
  password: string;
}

export interface ValidateCredentialsResponse {
  id: string;
  organizationId: string;
  email: string;
  name?: string;
  role: UserRole;
}
