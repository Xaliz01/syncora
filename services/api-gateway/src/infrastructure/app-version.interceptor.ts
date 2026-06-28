import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { readRuntimeVersion } from "@syncora/shared";
import type { Response } from "express";

/** Expose la version déployée sur chaque réponse HTTP (traçabilité clients / ops). */
@Injectable()
export class AppVersionInterceptor implements NestInterceptor {
  private readonly runtime = readRuntimeVersion();

  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader("X-App-Version", this.runtime.version);
    if (this.runtime.gitSha) {
      response.setHeader("X-Git-Sha", this.runtime.gitSha);
    }
    return next.handle();
  }
}
