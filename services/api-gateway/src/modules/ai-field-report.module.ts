import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AiFieldReportController } from "../presentation/http/ai-field-report.controller";
import { AbstractAiFieldReportService } from "../domain/ports/ai-field-report.service.port";
import { AiFieldReportService } from "../domain/ai-field-report.service";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

@Module({
  imports: [HttpModule.register({ timeout: 60_000, maxRedirects: 0 })],
  controllers: [AiFieldReportController],
  providers: [
    AssistantLlmClient,
    OrganizationScopedHttpClient,
    { provide: AbstractAiFieldReportService, useClass: AiFieldReportService },
  ],
})
export class AiFieldReportModule {}
