import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  ChangePasswordBody,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
} from "@syncora/shared";
import { AbstractAccountService } from "./ports/account.service.port";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class AccountService extends AbstractAccountService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async updateName(user: AuthUser, body: UpdateUserNameBody): Promise<UserResponse> {
    return this.callUsersService<UserResponse>({
      method: "put",
      path: `/users/${user.id}/name`,
      body,
    });
  }

  async changePassword(user: AuthUser, body: ChangePasswordBody): Promise<void> {
    await this.callUsersServiceRaw({
      method: "post",
      path: `/users/${user.id}/change-password`,
      body,
    });
  }

  async getPreferences(user: AuthUser): Promise<UserPreferencesResponse> {
    return this.callUsersService<UserPreferencesResponse>({
      method: "get",
      path: `/users/${user.id}/preferences`,
    });
  }

  async updatePreferences(
    user: AuthUser,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    return this.callUsersService<UserPreferencesResponse>({
      method: "put",
      path: `/users/${user.id}/preferences`,
      body,
    });
  }

  private async callUsersService<T>(params: {
    method: "get" | "post" | "put" | "patch" | "delete";
    path: string;
    body?: unknown;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${USERS_URL}${params.path}`,
          data: params.body,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callUsersServiceRaw(params: {
    method: "get" | "post" | "put" | "patch" | "delete";
    path: string;
    body?: unknown;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.request({
          method: params.method,
          url: `${USERS_URL}${params.path}`,
          data: params.body,
        }),
      );
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 404) throw new NotFoundException(message);
    throw err;
  }
}
