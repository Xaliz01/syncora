import { BadRequestException, Body, Controller, Post, UseGuards } from "@nestjs/common";
import { parseAssistantChatRequest, type AuthUser } from "@planwise/shared";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { AbstractAssistantService } from "../../domain/ports/assistant.service.port";

@Controller("assistant")
@UseGuards(JwtAuthGuard)
export class AssistantController {
  constructor(private readonly assistantService: AbstractAssistantService) {}

  @Post("chat")
  async chat(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const parsed = parseAssistantChatRequest(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.error);
    }
    return this.assistantService.chat(user, parsed.value);
  }
}
