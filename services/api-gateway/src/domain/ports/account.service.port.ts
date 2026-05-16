import type {
  AuthUser,
  ChangePasswordBody,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
} from "@syncora/shared";

export abstract class AbstractAccountService {
  abstract updateName(user: AuthUser, body: UpdateUserNameBody): Promise<UserResponse>;
  abstract changePassword(user: AuthUser, body: ChangePasswordBody): Promise<void>;
  abstract getPreferences(user: AuthUser): Promise<UserPreferencesResponse>;
  abstract updatePreferences(
    user: AuthUser,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse>;
}
