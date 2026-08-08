import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AssistantController } from "../presentation/http/assistant.controller";
import { AbstractAssistantService } from "../domain/ports/assistant.service.port";
import { AssistantService } from "../domain/assistant.service";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";

@Module({
  imports: [HttpModule.register({ timeout: 50_000, maxRedirects: 0 })],
  controllers: [AssistantController],
  providers: [
    AssistantLlmClient,
    { provide: AbstractAssistantService, useClass: AssistantService },
  ],
})
export class AssistantModule {}
