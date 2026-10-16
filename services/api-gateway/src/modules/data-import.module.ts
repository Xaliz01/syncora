import { Module } from "@nestjs/common";
import { DataImportController } from "../presentation/http/data-import.controller";
import { AbstractDataImportService } from "../domain/ports/data-import.service.port";
import { DataImportService } from "../domain/data-import.service";
import { AssistantLlmClient } from "../infrastructure/assistant/llm.client";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { StockDomainModule } from "./stock-domain.module";
import { CasesModule } from "./cases.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { UsersModule } from "./users.module";
import { TechniciansDomainModule } from "./technicians-domain.module";

@Module({
  imports: [
    SubscriptionsModule,
    CustomersDomainModule,
    StockDomainModule,
    CasesModule,
    OrganizationsDomainModule,
    UsersModule,
    TechniciansDomainModule,
  ],
  controllers: [DataImportController],
  providers: [
    AssistantLlmClient,
    { provide: AbstractDataImportService, useClass: DataImportService },
    RequirePermissionGuard,
  ],
  exports: [AbstractDataImportService],
})
export class DataImportModule {}
