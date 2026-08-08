import type { AccountUserResponse, UserResponse } from "@planwise/shared";
import type { UserDocument } from "../../persistence/user.schema";

export function isEmailVerified(doc: UserDocument): boolean {
  return doc.emailVerified !== false;
}

export function toUserBaseResponse(doc: UserDocument): Omit<UserResponse, "role"> {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId!,
    email: doc.email,
    name: doc.name,
    status: doc.status,
    createdAt: doc.get("createdAt")?.toISOString(),
    lastLoginAt: doc.lastLoginAt?.toISOString(),
  };
}

export function toAccountUserResponse(doc: UserDocument): AccountUserResponse {
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    status: doc.status,
    emailVerified: isEmailVerified(doc),
  };
}
