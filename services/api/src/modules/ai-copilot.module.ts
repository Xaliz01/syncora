import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { httpControllers } from "../process-role";
import { AiCopilotController } from "../presentation/http/ai-copilot.controller";
import { AbstractAiCopilotService } from "../domain/ports/ai-copilot.service.port";
import { AiCopilotService } from "../domain/ai-copilot.service";
import { AbstractAiQuotaService } from "../domain/ports/ai-quota.service.port";
import { AiQuotaService } from "../domain/ai-quota.service";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CasesModule } from "./cases.module";
import { CustomersModule } from "./customers.module";
import { PermissionsModule } from "./permissions.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { AiQuotaCounterSchema } from "../persistence/organizations/ai-quota-counter.schema";
import { CopilotSessionSchema } from "../persistence/organizations/copilot-session.schema";

@Module({
  imports: [
    HttpModule.register({ timeout: 50_000, maxRedirects: 0 }),
    MongooseModule.forFeature(
      [
        { name: "AiQuotaCounter", schema: AiQuotaCounterSchema },
        { name: "CopilotSession", schema: CopilotSessionSchema },
      ],
      "organizations",
    ),
    CasesModule,
    CustomersModule,
    PermissionsModule,
    SubscriptionsModule,
  ],
  controllers: httpControllers([AiCopilotController]),
  providers: [
    AssistantLlmClient,
    RequirePermissionGuard,
    { provide: AbstractAiQuotaService, useClass: AiQuotaService },
    { provide: AbstractAiCopilotService, useClass: AiCopilotService },
  ],
})
export class AiCopilotModule {}
