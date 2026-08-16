import type { LoginBody, PlatformAuthResponse, PlatformAuthUser } from "@planwise/shared";

export abstract class AbstractPlatformAuthService {
  abstract login(body: LoginBody): Promise<PlatformAuthResponse>;
  abstract getMe(user: PlatformAuthUser): Promise<PlatformAuthUser>;
}
