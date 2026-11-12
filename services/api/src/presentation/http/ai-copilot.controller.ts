import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import {
  parseCopilotCreateBody,
  parseCopilotDecideBody,
  parsePaginationQueryParams,
} from "@planwise/shared";
import type { AuthUser } from "@planwise/shared";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { AbstractAiCopilotService } from "../../domain/ports/ai-copilot.service.port";

@Controller("ai/copilot")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
@RequirePermissions("ai.copilot")
export class AiCopilotController {
  constructor(private readonly copilot: AbstractAiCopilotService) {}

  @Post("sessions")
  async createSession(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = parseCopilotCreateBody(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    return this.copilot.createSession(user, parsed.value);
  }

  @Post("sessions/:sessionId/decide")
  async decide(
    @CurrentUser() user: AuthUser,
    @Param("sessionId") sessionId: string,
    @Body() body: unknown,
  ) {
    const parsed = parseCopilotDecideBody(body);
    if (!parsed.ok) throw new BadRequestException(parsed.error);
    return this.copilot.decide(user, sessionId, parsed.value);
  }

  @Get("sessions")
  async listSessions(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const page = parsePaginationQueryParams(limit, offset);
    return this.copilot.listSessions(user, page.limit, page.offset);
  }

  @Get("sessions/:sessionId/audio")
  async audio(@CurrentUser() user: AuthUser, @Param("sessionId") sessionId: string) {
    const file = await this.copilot.getAudio(user, sessionId);
    return new StreamableFile(file.data, {
      type: file.mimeType,
      disposition: "inline",
    });
  }

  @Get("sessions/:sessionId")
  async getSession(@CurrentUser() user: AuthUser, @Param("sessionId") sessionId: string) {
    return this.copilot.getSession(user, sessionId);
  }

  @Get("quota")
  async quota(@CurrentUser() user: AuthUser) {
    return this.copilot.getQuota(user);
  }
}
