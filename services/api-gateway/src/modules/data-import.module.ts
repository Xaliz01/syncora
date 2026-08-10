import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DataImportController } from "../presentation/http/data-import.controller";
import { AbstractDataImportService } from "../domain/ports/data-import.service.port";
import { DataImportService } from "../domain/data-import.service";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [SubscriptionsModule, HttpModule.register({ timeout: 50_000, maxRedirects: 0 })],
  controllers: [DataImportController],
  providers: [
    AssistantLlmClient,
    { provide: AbstractDataImportService, useClass: DataImportService },
    RequirePermissionGuard,
  ],
  exports: [AbstractDataImportService],
})
export class DataImportModule {}
